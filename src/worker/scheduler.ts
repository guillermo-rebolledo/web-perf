import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { enqueueAuditJob } from "@/lib/queue";
import { addMinutes } from "date-fns";

export function startScheduler() {
  console.log("[Scheduler] Starting cron scheduler (runs every minute)");

  // Run every minute
  cron.schedule("*/1 * * * *", async () => {
    try {
      await processDueMonitors();
    } catch (error) {
      console.error("[Scheduler] Error processing due monitors:", error);
    }
  });
}

export async function processDueMonitors() {
  const now = new Date();

  // Find all active monitors that are due for a run
  const dueMonitors = await prisma.monitor.findMany({
    where: {
      isActive: true,
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

      // Create a new run
      const run = await prisma.run.create({
        data: {
          monitorId: monitor.id,
          status: "queued",
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
