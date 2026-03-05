import type { PrismaClient } from "@prisma/client";
import type { NotificationRegression } from "./types";

const SEVERITY_RANK = { minor: 0, moderate: 1, critical: 2 } as const;
type KnownSeverity = keyof typeof SEVERITY_RANK;

function severityRank(severity: string): number {
  return severity in SEVERITY_RANK
    ? SEVERITY_RANK[severity as KnownSeverity]
    : -1;
}

/**
 * Filters regressions to only those that are new or have escalated in severity.
 * Suppresses re-notification for metrics with an existing open/acknowledged alert
 * on the same monitor that hasn't been resolved yet.
 *
 * - New regression (no prior unresolved alert) → passes through
 * - Severity escalated (new > existing max) → passes through
 * - Prior resolved alert → passes through (recurrence after resolution)
 * - Prior open/acknowledged at same or higher severity → suppressed
 */
export async function filterNewRegressions(
  monitorId: string,
  currentRunId: string,
  regressions: NotificationRegression[],
  prismaClient: PrismaClient,
): Promise<NotificationRegression[]> {
  if (regressions.length === 0) return [];

  const existingAlerts = await prismaClient.regressionAlert.findMany({
    where: {
      run: { monitorId },
      runId: { not: currentRunId },
      status: { not: "resolved" },
      metricName: { in: regressions.map((r) => r.metricName) },
    },
    select: { metricName: true, severity: true },
  });

  // Track the highest existing unresolved severity per metric
  const existingMaxRank = new Map<string, number>();
  for (const alert of existingAlerts) {
    const current = existingMaxRank.get(alert.metricName) ?? -1;
    const rank = severityRank(alert.severity);
    if (rank > current) existingMaxRank.set(alert.metricName, rank);
  }

  return regressions.filter((r) => {
    const priorRank = existingMaxRank.get(r.metricName);
    if (priorRank === undefined) return true; // new regression
    return severityRank(r.severity) > priorRank; // escalation only
  });
}
