import { prisma } from "@/lib/prisma";
import { DEFAULT_RUN_RETENTION_DAYS, DEFAULT_ACTIVITY_RETENTION_DAYS } from "@/lib/retention";
import { createLogger } from "@/lib/logger";

const log = createLogger("Retention");

interface RetentionStats {
  runsDeleted: number;
}

/**
 * Delete completed runs older than the specified number of days.
 *
 * Cascade deletes via Prisma automatically remove the associated
 * Audit, Insight, and RegressionAlert rows for each deleted Run.
 *
 * Only runs with a completedAt timestamp are eligible — queued and
 * running rows are never touched.
 *
 * Deletions are batched (500 rows at a time) to avoid long-running
 * transactions and excessive DB lock pressure.
 */
export async function cleanupOldRuns(
  olderThanDays: number = DEFAULT_RUN_RETENTION_DAYS
): Promise<RetentionStats> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  log.info("Deleting old runs", { cutoffDate: cutoffDate.toISOString(), olderThanDays });

  const BATCH_SIZE = 500;
  let totalDeleted = 0;

  while (true) {
    const batch = await prisma.run.findMany({
      where: {
        completedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    const ids = batch.map((r) => r.id);
    const result = await prisma.run.deleteMany({
      where: { id: { in: ids } },
    });

    totalDeleted += result.count;
    log.debug("Deleted batch of runs", { batchCount: result.count, totalDeleted });

    if (batch.length < BATCH_SIZE) break;
  }

  log.info("Run cleanup complete", { totalDeleted });
  return { runsDeleted: totalDeleted };
}

/**
 * Delete ActivityEvent rows older than the specified number of days.
 *
 * Batched (500 rows at a time) to avoid long-running transactions.
 */
export async function cleanupOldActivityEvents(
  olderThanDays: number = DEFAULT_ACTIVITY_RETENTION_DAYS
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  log.info("Deleting old activity events", { cutoffDate: cutoffDate.toISOString(), olderThanDays });

  const BATCH_SIZE = 500;
  let totalDeleted = 0;

  while (true) {
    const batch = await prisma.activityEvent.findMany({
      where: { createdAt: { lt: cutoffDate } },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    const { count } = await prisma.activityEvent.deleteMany({
      where: { id: { in: batch.map((e) => e.id) } },
    });

    totalDeleted += count;

    if (batch.length < BATCH_SIZE) break;
  }

  log.info("Activity event cleanup complete", { totalDeleted });
  return totalDeleted;
}
