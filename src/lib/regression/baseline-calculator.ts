import { PrismaClient, RunStatus } from "@prisma/client";
import { createLogger } from "@/lib/logger";

const prisma = new PrismaClient();
const log = createLogger("BaselineCalc");

/**
 * Metric names that we track for regression detection
 */
const TRACKED_METRICS = ["lcp", "tbt", "cls", "inp", "fcp", "ttfb"] as const;

/**
 * Minimum number of runs required to establish a baseline
 */
const MIN_SAMPLE_SIZE = 5;

/**
 * Number of recent runs to include in baseline calculation (rolling window)
 */
const BASELINE_WINDOW_SIZE = 30;

/**
 * Calculate median value from an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate baselines for all metrics for a given monitor
 *
 * This function:
 * 1. Fetches the last 30 successful runs for the monitor (same strategy)
 * 2. For each metric (lcp, tbt, cls, inp, fcp, ttfb): calculates median value
 * 3. Upserts to RegressionBaseline table (handles updates)
 * 4. Skips if < 5 runs available (not enough data)
 *
 * @param monitorId - The monitor ID to calculate baselines for
 * @param prismaClient - Optional Prisma client (useful for transactions)
 */
export async function calculateBaselines(
  monitorId: string,
  prismaClient?: PrismaClient,
): Promise<void> {
  const db = prismaClient || prisma;

  // Fetch the last 30 successful runs for this monitor
  const runs = await db.run.findMany({
    where: {
      monitorId,
      status: RunStatus.success,
    },
    orderBy: {
      completedAt: "desc",
    },
    take: BASELINE_WINDOW_SIZE,
    select: {
      lcp: true,
      tbt: true,
      cls: true,
      inp: true,
      fcp: true,
      ttfb: true,
    },
  });

  // Need at least MIN_SAMPLE_SIZE runs to establish a baseline
  if (runs.length < MIN_SAMPLE_SIZE) {
    log.debug("Not enough runs for baseline", { runs: runs.length, required: MIN_SAMPLE_SIZE, monitorId });
    return;
  }

  // Calculate baseline for each metric
  for (const metricName of TRACKED_METRICS) {
    // Extract non-null values for this metric
    const values = runs
      .map((run) => run[metricName])
      .filter((val): val is number => val !== null && val !== undefined);

    // Skip if no valid values
    if (values.length < MIN_SAMPLE_SIZE) {
      log.debug("Not enough valid values for metric baseline", { metricName, values: values.length, required: MIN_SAMPLE_SIZE });
      continue;
    }

    const medianValue = calculateMedian(values);

    // Upsert baseline (create or update)
    await db.regressionBaseline.upsert({
      where: {
        monitorId_metricName: {
          monitorId,
          metricName,
        },
      },
      create: {
        monitorId,
        metricName,
        medianValue,
        sampleSize: values.length,
      },
      update: {
        medianValue,
        sampleSize: values.length,
        calculatedAt: new Date(),
      },
    });

    log.debug("Updated baseline", { metricName, medianValue: parseFloat(medianValue.toFixed(2)), sampleSize: values.length, monitorId });
  }
}
