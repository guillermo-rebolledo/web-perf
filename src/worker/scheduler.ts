import * as Sentry from "@sentry/node";
import nodeCron from "node-cron";
import { prisma } from "@/lib/prisma";
import { enqueueAuditJob, enqueueDigestJob } from "@/lib/queue";
import { cleanupOldScreenshots } from "@/lib/screenshot-cleanup";
import { cleanupOldRuns, cleanupOldActivityEvents } from "@/lib/data-retention";
import { checkRateLimit } from "@/lib/rate-limit";
import { env } from "@/env";
import { addMinutes } from "date-fns";
import { RunStatus } from "@prisma/client";
import { DEFAULT_RUN_RETENTION_DAYS, DEFAULT_ACTIVITY_RETENTION_DAYS } from "@/lib/retention";
import { createLogger } from "@/lib/logger";

const log = createLogger("Scheduler");

const cron = Sentry.cron.instrumentNodeCron(nodeCron);

export function startScheduler() {
  log.info("Starting cron scheduler");

  cron.schedule(
    "*/1 * * * *",
    async () => {
      try {
        await processDueMonitors();
      } catch (error) {
        log.error("Error processing due monitors", error);
      }
    },
    { name: "scheduler-process-due-monitors" },
  );

  cron.schedule(
    "0 9 * * 1",
    async () => {
      try {
        log.info("Enqueuing weekly digest job");
        await enqueueDigestJob();
      } catch (error) {
        log.error("Error enqueuing weekly digest", error);
      }
    },
    { name: "scheduler-weekly-digest" },
  );

  cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        log.info("Running daily screenshot cleanup", { ttlDays: env.SCREENSHOT_TTL_DAYS });
        await cleanupOldScreenshots(env.SCREENSHOT_TTL_DAYS);
      } catch (error) {
        log.error("Error during screenshot cleanup", error);
      }
    },
    { name: "scheduler-screenshot-cleanup" },
  );

  cron.schedule(
    "0 4 * * *",
    async () => {
      try {
        const retentionDays = env.RUN_RETENTION_DAYS ?? DEFAULT_RUN_RETENTION_DAYS;
        log.info("Running daily data retention cleanup", { retentionDays, activityRetentionDays: DEFAULT_ACTIVITY_RETENTION_DAYS });
        await cleanupOldRuns(retentionDays);
        await cleanupOldActivityEvents(DEFAULT_ACTIVITY_RETENTION_DAYS);
      } catch (error) {
        log.error("Error during data retention cleanup", error);
      }
    },
    { name: "scheduler-data-retention" },
  );

  cron.schedule(
    "*/10 * * * *",
    async () => {
      try {
        await reapStuckRuns();
      } catch (error) {
        log.error("Error during stuck-run reaper", error);
      }
    },
    { name: "scheduler-stuck-run-reaper" },
  );
}

/** Timeout after which a queued or running run is considered stuck (ms). */
const STUCK_RUN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Marks runs that have been stuck in `queued` or `running` for longer than
 * STUCK_RUN_TIMEOUT_MS as `failed`. This unblocks the idempotency check so
 * the monitor can accept a new run the next time it is due.
 */
export async function reapStuckRuns() {
  const cutoff = new Date(Date.now() - STUCK_RUN_TIMEOUT_MS);

  const { count } = await prisma.run.updateMany({
    where: {
      OR: [
        { status: RunStatus.queued, queuedAt: { lt: cutoff } },
        { status: RunStatus.running, startedAt: { lt: cutoff } },
      ],
    },
    data: {
      status: RunStatus.failed,
      completedAt: new Date(),
      errorMessage: "Run timed out — marked failed by stuck-run reaper",
    },
  });

  if (count > 0) {
    log.warn("Reaped stuck runs", { count, timeoutMinutes: 30 });
  }
}

export async function processDueMonitors() {
  const now = new Date();

  // Find all active schedule monitors that are due for a run
  const dueMonitors = await prisma.monitor.findMany({
    where: {
      isActive: true,
      triggerType: "schedule",
      nextRunAt: {
        lte: now,
      },
    },
    include: {
      site: true,
      runs: {
        where: {
          status: {
            in: ["queued", "running"],
          },
        },
        take: 1,
      },
    },
  });

  if (dueMonitors.length === 0) {
    return;
  }

  log.info("Found due monitors", { count: dueMonitors.length });

  for (const monitor of dueMonitors) {
    try {
      // Idempotency check: skip if there's already a queued or running job
      if (monitor.runs.length > 0) {
        log.debug("Monitor already has an active run, skipping", {
          monitorId: monitor.id,
          runStatus: monitor.runs[0].status,
        });
        continue;
      }

      // Quota check: enforce scheduled-run daily limit per user
      const quota = await checkRateLimit(
        monitor.site.userId,
        env.RATE_LIMIT_SCHEDULED_RUNS_PER_DAY,
        "scheduled",
        true, // failOpen — Redis error must not halt all scheduled monitoring
      );
      if (!quota.success) {
        log.warn("Scheduled-run quota exceeded, skipping monitor", {
          userId: monitor.site.userId,
          monitorId: monitor.id,
          quotaResetsAt: quota.reset.toISOString(),
        });
        await prisma.monitor.update({
          where: { id: monitor.id },
          data: { nextRunAt: addMinutes(now, monitor.cadenceMinutes) },
        });
        continue;
      }

      // Create a new run
      const run = await prisma.run.create({
        data: {
          monitorId: monitor.id,
          status: RunStatus.queued,
          queuedAt: now,
        },
      });

      // Enqueue the job
      const jobId = await enqueueAuditJob({
        runId: run.id,
        monitorId: monitor.id,
        siteUrl: monitor.site.url,
        strategy: monitor.strategy as "mobile" | "desktop",
      });

      // Update run with jobId
      await prisma.run.update({
        where: { id: run.id },
        data: { jobId },
      });

      // Update monitor's nextRunAt
      const nextRunAt = addMinutes(now, monitor.cadenceMinutes);
      await prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          nextRunAt,
        },
      });

      log.info("Enqueued run for monitor", {
        runId: run.id,
        monitorId: monitor.id,
        siteUrl: monitor.site.url,
        nextRunAt: nextRunAt.toISOString(),
      });
    } catch (error) {
      log.error("Error processing monitor", error, { monitorId: monitor.id });
    }
  }
}
