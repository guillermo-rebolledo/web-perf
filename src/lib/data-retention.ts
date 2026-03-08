import { prisma } from "@/lib/prisma";
import { DEFAULT_RUN_RETENTION_DAYS } from "@/lib/retention";

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

  console.log(
    `[Retention] Deleting runs completed before ${cutoffDate.toISOString()} (older than ${olderThanDays} days)`
  );

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
    console.log(
      `[Retention] Deleted batch of ${result.count} runs (total so far: ${totalDeleted})`
    );

    if (batch.length < BATCH_SIZE) break;
  }

  console.log(`[Retention] Cleanup complete. Runs deleted: ${totalDeleted}`);
  return { runsDeleted: totalDeleted };
}
