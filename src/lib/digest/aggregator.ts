import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

// ── Public types ────────────────────────────────────────────────────────────

export interface WeekMetrics {
  avgPerformanceScore: number | null;
  avgAccessibilityScore: number | null;
  avgSeoScore: number | null;
  avgBestPracticesScore: number | null;
  avgLcp: number | null;
  avgCls: number | null;
  avgInp: number | null;
  runCount: number;
}

export interface TopRegression {
  metricName: string;
  severity: "minor" | "moderate" | "critical";
  percentChange: number;
  siteName: string;
  siteUrl: string;
}

export interface SiteDigest {
  site: { id: string; name: string; url: string };
  monitorId: string;
  strategy: string;
  thisWeek: WeekMetrics;
  lastWeek: WeekMetrics;
  trend: "improving" | "declining" | "stable";
  openAlerts: { critical: number; moderate: number; minor: number };
  topRegressions: TopRegression[];
}

export interface UserDigestData {
  user: { id: string; email: string; name: string | null };
  weekRange: { start: Date; end: Date };
  sites: SiteDigest[];
  summary: {
    totalSites: number;
    sitesImproving: number;
    sitesDeclining: number;
    totalCriticalAlerts: number;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type RunSlice = {
  completedAt: Date | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  bestPracticesScore: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
};

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function computeWeekMetrics(runs: RunSlice[]): WeekMetrics {
  return {
    avgPerformanceScore: avg(runs.map((r) => r.performanceScore)),
    avgAccessibilityScore: avg(runs.map((r) => r.accessibilityScore)),
    avgSeoScore: avg(runs.map((r) => r.seoScore)),
    avgBestPracticesScore: avg(runs.map((r) => r.bestPracticesScore)),
    avgLcp: avg(runs.map((r) => r.lcp)),
    avgCls: avg(runs.map((r) => r.cls)),
    avgInp: avg(runs.map((r) => r.inp)),
    runCount: runs.length,
  };
}

function computeTrend(
  thisScore: number | null,
  lastScore: number | null
): "improving" | "declining" | "stable" {
  if (thisScore === null || lastScore === null) return "stable";
  const delta = thisScore - lastScore;
  if (delta > 3) return "improving";
  if (delta < -3) return "declining";
  return "stable";
}

// ── Main aggregation ─────────────────────────────────────────────────────────

/**
 * Aggregates the past 14 days of data for a user and returns a digest payload.
 * Returns null if the user has no sites or no successful runs in the last 7 days.
 */
export async function aggregateUserDigest(
  userId: string
): Promise<UserDigestData | null> {
  const now = new Date();
  const weekEnd = startOfDay(now);
  const weekStart = subDays(weekEnd, 7);
  const prevWeekStart = subDays(weekStart, 7);

  const sites = await prisma.site.findMany({
    where: { userId },
    include: {
      monitors: {
        where: { isActive: true },
        include: {
          runs: {
            where: {
              status: "success",
              completedAt: { gte: prevWeekStart },
            },
            select: {
              id: true,
              completedAt: true,
              performanceScore: true,
              accessibilityScore: true,
              seoScore: true,
              bestPracticesScore: true,
              lcp: true,
              cls: true,
              inp: true,
            },
            orderBy: { completedAt: "desc" },
          },
        },
      },
    },
  });

  if (sites.length === 0) return null;

  // Collect all run IDs from this week to query alerts in one shot
  const thisWeekRunIds: string[] = [];
  for (const site of sites) {
    for (const monitor of site.monitors) {
      for (const run of monitor.runs) {
        if (run.completedAt && run.completedAt >= weekStart) {
          thisWeekRunIds.push(run.id);
        }
      }
    }
  }

  if (thisWeekRunIds.length === 0) return null;

  // Fetch open alerts for this week's runs
  const alerts = await prisma.regressionAlert.findMany({
    where: {
      runId: { in: thisWeekRunIds },
      status: { not: "resolved" },
    },
    select: {
      runId: true,
      severity: true,
      metricName: true,
      percentChange: true,
      run: { select: { monitorId: true } },
    },
  });

  // Index alerts by monitorId for fast lookup
  const alertsByMonitor = new Map<
    string,
    Array<{ severity: string; metricName: string; percentChange: number }>
  >();
  for (const alert of alerts) {
    const monitorId = alert.run.monitorId;
    if (!alertsByMonitor.has(monitorId)) alertsByMonitor.set(monitorId, []);
    alertsByMonitor.get(monitorId)!.push({
      severity: alert.severity,
      metricName: alert.metricName,
      percentChange: alert.percentChange,
    });
  }

  const siteDigests: SiteDigest[] = [];

  for (const site of sites) {
    // Use first active monitor per site
    const monitor = site.monitors[0];
    if (!monitor) continue;

    const thisWeekRuns = monitor.runs.filter(
      (r) => r.completedAt !== null && r.completedAt >= weekStart
    );
    const lastWeekRuns = monitor.runs.filter(
      (r) =>
        r.completedAt !== null &&
        r.completedAt >= prevWeekStart &&
        r.completedAt < weekStart
    );

    const thisWeek = computeWeekMetrics(thisWeekRuns);
    const lastWeek = computeWeekMetrics(lastWeekRuns);
    const trend = computeTrend(
      thisWeek.avgPerformanceScore,
      lastWeek.avgPerformanceScore
    );

    const openAlerts = { critical: 0, moderate: 0, minor: 0 };
    const topRegressionCandidates: TopRegression[] = [];

    for (const alert of alertsByMonitor.get(monitor.id) ?? []) {
      const sev = alert.severity as "critical" | "moderate" | "minor";
      openAlerts[sev]++;
      topRegressionCandidates.push({
        metricName: alert.metricName,
        severity: sev,
        percentChange: alert.percentChange,
        siteName: site.name,
        siteUrl: site.url,
      });
    }

    // Top 3 regressions: critical first, then highest % change
    const topRegressions = topRegressionCandidates
      .sort((a, b) => {
        const sevOrder = { critical: 0, moderate: 1, minor: 2 };
        if (sevOrder[a.severity] !== sevOrder[b.severity]) {
          return sevOrder[a.severity] - sevOrder[b.severity];
        }
        return Math.abs(b.percentChange) - Math.abs(a.percentChange);
      })
      .slice(0, 3);

    siteDigests.push({
      site: { id: site.id, name: site.name, url: site.url },
      monitorId: monitor.id,
      strategy: monitor.strategy,
      thisWeek,
      lastWeek,
      trend,
      openAlerts,
      topRegressions,
    });
  }

  if (siteDigests.length === 0) return null;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  const summary = {
    totalSites: siteDigests.length,
    sitesImproving: siteDigests.filter((s) => s.trend === "improving").length,
    sitesDeclining: siteDigests.filter((s) => s.trend === "declining").length,
    totalCriticalAlerts: siteDigests.reduce(
      (acc, s) => acc + s.openAlerts.critical,
      0
    ),
  };

  return { user, weekRange: { start: weekStart, end: weekEnd }, sites: siteDigests, summary };
}
