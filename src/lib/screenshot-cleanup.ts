import { prisma } from "@/lib/prisma";

/**
 * Cleanup utility to remove old screenshot data from the database
 * This helps reduce database size by removing screenshots from runs older than the TTL
 */

interface CleanupStats {
  runsProcessed: number;
  screenshotsDeleted: number;
  bytesFreed: number; // Approximate
}

/**
 * Remove screenshot data from runs older than the specified number of days
 * @param olderThanDays Number of days - runs older than this will have screenshots removed
 * @returns Statistics about the cleanup operation
 */
export async function cleanupOldScreenshots(
  olderThanDays: number = 30
): Promise<CleanupStats> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  console.log(
    `[Cleanup] Removing screenshots from runs older than ${olderThanDays} days (before ${cutoffDate.toISOString()})`
  );

  // Find runs with screenshots that are older than the cutoff
  const runsWithScreenshots = await prisma.run.findMany({
    where: {
      screenshotData: {
        not: null,
      },
      completedAt: {
        lt: cutoffDate,
      },
    },
    select: {
      id: true,
      screenshotData: true,
    },
  });

  if (runsWithScreenshots.length === 0) {
    console.log("[Cleanup] No old screenshots found to clean up");
    return {
      runsProcessed: 0,
      screenshotsDeleted: 0,
      bytesFreed: 0,
    };
  }

  // Calculate approximate bytes freed (base64 length)
  const bytesFreed = runsWithScreenshots.reduce((total, run) => {
    return total + (run.screenshotData?.length || 0);
  }, 0);

  // Update runs to remove screenshot data
  const result = await prisma.run.updateMany({
    where: {
      id: {
        in: runsWithScreenshots.map((r) => r.id),
      },
    },
    data: {
      screenshotData: null,
    },
  });

  const stats: CleanupStats = {
    runsProcessed: result.count,
    screenshotsDeleted: runsWithScreenshots.length,
    bytesFreed,
  };

  console.log(
    `[Cleanup] Successfully removed ${stats.screenshotsDeleted} screenshots from ${stats.runsProcessed} runs`
  );
  console.log(
    `[Cleanup] Approximate space freed: ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`
  );

  return stats;
}

/**
 * Get statistics about screenshot storage without performing cleanup
 * Useful for monitoring and deciding on TTL policies
 */
export async function getScreenshotStats() {
  const [totalRuns, runsWithScreenshots, oldRunsWithScreenshots] =
    await Promise.all([
      prisma.run.count(),
      prisma.run.count({
        where: {
          screenshotData: {
            not: null,
          },
        },
      }),
      prisma.run.count({
        where: {
          screenshotData: {
            not: null,
          },
          completedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          },
        },
      }),
    ]);

  return {
    totalRuns,
    runsWithScreenshots,
    oldRunsWithScreenshots,
    percentageWithScreenshots:
      totalRuns > 0 ? ((runsWithScreenshots / totalRuns) * 100).toFixed(1) : "0",
  };
}
