import * as Sentry from "@sentry/node";
import nodeCron from "node-cron";
import { prisma } from "@/lib/prisma";
import { enqueueAuditJob, enqueueDigestJob } from "@/lib/queue";
import { cleanupOldScreenshots } from "@/lib/screenshot-cleanup";
import { cleanupOldRuns } from "@/lib/data-retention";
import { checkRateLimit } from "@/lib/rate-limit";
import { env } from "@/env";
import { addMinutes } from "date-fns";
import { RunStatus } from "@prisma/client";

const cron = Sentry.cron.instrumentNodeCron(nodeCron);

export function startScheduler() {
  console.log("[Scheduler] Starting cron scheduler (runs every minute)");

  cron.schedule(
    "*/1 * * * *",
    async () => {
      try {
        await processDueMonitors();
      } catch (error) {
        console.error("[Scheduler] Error processing due monitors:", error);
      }
    },
    { name: "scheduler-process-due-monitors" },
  );

  cron.schedule(
    "0 9 * * 1",
    async () => {
      try {
        console.log("[Scheduler] Enqueuing weekly digest job");
        await enqueueDigestJob();
      } catch (error) {
        console.error("[Scheduler] Error enqueuing weekly digest:", error);
      }
    },
    { name: "scheduler-weekly-digest" },
  );

  cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        console.log("[Scheduler] Running daily screenshot cleanup");
        await cleanupOldScreenshots(env.SCREENSHOT_TTL_DAYS);
      } catch (error) {
        console.error("[Scheduler] Error during screenshot cleanup:", error);
      }
    },
    { name: "scheduler-screenshot-cleanup" },
  );

  cron.schedule(
    "0 4 * * *",
    async () => {
      try {
        console.log(
          `[Scheduler] Running daily data retention cleanup (window: ${env.RUN_RETENTION_DAYS} days)`
        );
        await cleanupOldRuns(env.RUN_RETENTION_DAYS);
      } catch (error) {
        console.error("[Scheduler] Error during data retention cleanup:", error);
      }
    },
    { name: "scheduler-data-retention" },
  );
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

  console.log(`[Scheduler] Found ${dueMonitors.length} due monitor(s)`);

  for (const monitor of dueMonitors) {
    try {
      // Idempotency check: skip if there's already a queued or running job
      if (monitor.runs.length > 0) {
        console.log(
          `[Scheduler] Monitor ${monitor.id} already has a ${monitor.runs[0].status} run, skipping`
        );
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
        console.warn(
          `[Scheduler] Scheduled-run quota exceeded for user ${monitor.site.userId}, skipping monitor ${monitor.id} (resets ${quota.reset.toISOString()})`
        );
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

      console.log(
        `[Scheduler] Enqueued run ${run.id} for monitor ${monitor.id} (${monitor.site.url}), next run at ${nextRunAt.toISOString()}`
      );
    } catch (error) {
      console.error(
        `[Scheduler] Error processing monitor ${monitor.id}:`,
        error
      );
    }
  }
}
