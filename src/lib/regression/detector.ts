import { PrismaClient, Run } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Regression thresholds per metric
 * A regression is detected if BOTH conditions are met:
 * - Percent change exceeds percentChange threshold
 * - Absolute change exceeds absoluteChange threshold
 */
const REGRESSION_THRESHOLDS = {
  lcp: { percentChange: 15, absoluteChange: 300 }, // 15% OR 300ms
  tbt: { percentChange: 20, absoluteChange: 100 }, // 20% OR 100ms
  cls: { percentChange: 25, absoluteChange: 0.05 }, // 25% OR 0.05
  inp: { percentChange: 20, absoluteChange: 100 }, // 20% OR 100ms
  fcp: { percentChange: 15, absoluteChange: 300 }, // 15% OR 300ms
  ttfb: { percentChange: 20, absoluteChange: 200 }, // 20% OR 200ms
} as const;

type TrackedMetric = keyof typeof REGRESSION_THRESHOLDS;
type Severity = "minor" | "moderate" | "critical";
type Confidence = "low" | "medium" | "high";

/**
 * Data structure for a regression alert (before saving to DB)
 */
export interface RegressionAlertData {
  runId: string;
  metricName: string;
  baselineValue: number;
  actualValue: number;
  delta: number;
  percentChange: number;
  severity: Severity;
  confidence: Confidence;
}

/**
 * Classify severity based on how much the metric exceeded the threshold
 */
function calculateSeverity(percentChange: number): Severity {
  const absPercentChange = Math.abs(percentChange);

  if (absPercentChange >= 50) return "critical"; // >50% regression
  if (absPercentChange >= 20) return "moderate"; // 20-50% regression
  return "minor"; // <20% regression
}

/**
 * Calculate confidence based on consecutive regressions
 * - low: First occurrence
 * - medium: 2 consecutive regressions
 * - high: 3+ consecutive regressions
 */
async function calculateConfidence(
  monitorId: string,
  metricName: string,
  currentRunId: string,
  prismaClient: PrismaClient,
): Promise<Confidence> {
  // Get the last 3 runs before this one
  const recentRuns = await prismaClient.run.findMany({
    where: {
      monitorId,
      status: "success",
      id: { not: currentRunId },
    },
    orderBy: {
      completedAt: "desc",
    },
    take: 3,
    include: {
      regressionAlerts: {
        where: {
          metricName,
        },
      },
    },
  });

  // Count how many of the recent runs had regressions for this metric
  const consecutiveRegressions = recentRuns.filter(
    (run) => run.regressionAlerts.length > 0,
  ).length;

  if (consecutiveRegressions >= 2) return "high"; // 3+ consecutive (including current)
  if (consecutiveRegressions >= 1) return "medium"; // 2 consecutive
  return "low"; // First occurrence
}

/**
 * Detect regressions for a completed run
 *
 * This function:
 * 1. Loads baselines for the monitor
 * 2. For each metric, checks if delta exceeds thresholds (both % AND absolute)
 * 3. Calculates severity and confidence
 * 4. Returns array of regression alerts (not yet saved to DB)
 *
 * @param run - The run to check for regressions (must include monitor relation)
 * @param prismaClient - Optional Prisma client (useful for transactions)
 * @returns Array of regression alert data objects
 */
export async function detectRegressions(
  run: Run & { monitor: { id: string } },
  prismaClient?: PrismaClient,
): Promise<RegressionAlertData[]> {
  const db = prismaClient || prisma;
  const alerts: RegressionAlertData[] = [];

  // Load baselines for this monitor
  const baselines = await db.regressionBaseline.findMany({
    where: {
      monitorId: run.monitor.id,
    },
  });

  if (baselines.length === 0) {
    console.log(
      `[Regression Detector] No baselines found for monitor ${run.monitor.id}`,
    );
    return [];
  }

  // Check each metric
  for (const baseline of baselines) {
    const metricName = baseline.metricName as TrackedMetric;
    const threshold = REGRESSION_THRESHOLDS[metricName];

    if (!threshold) {
      console.warn(
        `[Regression Detector] Unknown metric: ${metricName}`,
      );
      continue;
    }

    // Get actual value from run
    const actualValue = run[metricName as keyof Run] as number | null;

    if (actualValue === null || actualValue === undefined) {
      continue; // Metric not available in this run
    }

    const baselineValue = baseline.medianValue;
    const delta = actualValue - baselineValue;
    const percentChange = (delta / baselineValue) * 100;

    // Check if regression threshold is met (both conditions)
    const meetsPercentThreshold = Math.abs(percentChange) >= threshold.percentChange;
    const meetsAbsoluteThreshold = Math.abs(delta) >= threshold.absoluteChange;

    if (meetsPercentThreshold && meetsAbsoluteThreshold && delta > 0) {
      // Regression detected (value increased beyond thresholds)
      const severity = calculateSeverity(percentChange);
      const confidence = await calculateConfidence(
        run.monitor.id,
        metricName,
        run.id,
        db,
      );

      alerts.push({
        runId: run.id,
        metricName,
        baselineValue,
        actualValue,
        delta,
        percentChange,
        severity,
        confidence,
      });

      console.log(
        `[Regression Detector] Regression detected: ${metricName} = ${actualValue.toFixed(2)} (baseline: ${baselineValue.toFixed(2)}, +${percentChange.toFixed(1)}%, severity: ${severity}, confidence: ${confidence})`,
      );
    }
  }

  return alerts;
}
