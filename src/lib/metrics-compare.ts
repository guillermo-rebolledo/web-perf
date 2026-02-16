import { Run, Audit } from "@prisma/client";

export interface MetricDelta {
  name: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  percentChange: number | null;
  isImprovement: boolean;
  unit: string;
}

export interface AuditDelta {
  auditId: string;
  title: string;
  beforeScore: number | null;
  afterScore: number | null;
  scoreDelta: number | null;
  isRegression: boolean;
}

export interface RunComparison {
  scores: MetricDelta[];
  metrics: MetricDelta[];
  audits: AuditDelta[];
}

export function compareRuns(
  beforeRun: Run & { audits: Audit[] },
  afterRun: Run & { audits: Audit[] }
): RunComparison {
  // Compare scores (higher is better)
  const scores: MetricDelta[] = [
    createMetricDelta(
      "Performance",
      beforeRun.performanceScore,
      afterRun.performanceScore,
      "points",
      true
    ),
    createMetricDelta(
      "Accessibility",
      beforeRun.accessibilityScore,
      afterRun.accessibilityScore,
      "points",
      true
    ),
    createMetricDelta(
      "Best Practices",
      beforeRun.bestPracticesScore,
      afterRun.bestPracticesScore,
      "points",
      true
    ),
    createMetricDelta(
      "SEO",
      beforeRun.seoScore,
      afterRun.seoScore,
      "points",
      true
    ),
  ];

  // Compare metrics (lower is better for time-based metrics, lower is better for CLS)
  const metrics: MetricDelta[] = [
    createMetricDelta("LCP", beforeRun.lcp, afterRun.lcp, "ms", false),
    createMetricDelta("INP", beforeRun.inp, afterRun.inp, "ms", false),
    createMetricDelta("TBT", beforeRun.tbt, afterRun.tbt, "ms", false),
    createMetricDelta("CLS", beforeRun.cls, afterRun.cls, "", false),
    createMetricDelta("FCP", beforeRun.fcp, afterRun.fcp, "ms", false),
    createMetricDelta("TTFB", beforeRun.ttfb, afterRun.ttfb, "ms", false),
  ].filter((m) => m.before !== null || m.after !== null);

  // Compare audits
  const beforeAuditsMap = new Map(
    beforeRun.audits.map((a) => [a.auditId, a])
  );
  const afterAuditsMap = new Map(
    afterRun.audits.map((a) => [a.auditId, a])
  );

  const allAuditIds = new Set([
    ...beforeAuditsMap.keys(),
    ...afterAuditsMap.keys(),
  ]);

  const audits: AuditDelta[] = Array.from(allAuditIds)
    .map((auditId) => {
      const beforeAudit = beforeAuditsMap.get(auditId);
      const afterAudit = afterAuditsMap.get(auditId);

      if (!beforeAudit && !afterAudit) return null;

      const beforeScore = beforeAudit?.score ?? null;
      const afterScore = afterAudit?.score ?? null;
      const scoreDelta =
        beforeScore !== null && afterScore !== null
          ? afterScore - beforeScore
          : null;

      return {
        auditId,
        title: afterAudit?.title || beforeAudit?.title || auditId,
        beforeScore,
        afterScore,
        scoreDelta,
        isRegression: scoreDelta !== null && scoreDelta < 0,
      };
    })
    .filter((a): a is AuditDelta => a !== null)
    .sort((a, b) => {
      // Sort regressions first, then by delta magnitude
      if (a.isRegression && !b.isRegression) return -1;
      if (!a.isRegression && b.isRegression) return 1;
      return (a.scoreDelta ?? 0) - (b.scoreDelta ?? 0);
    });

  return { scores, metrics, audits };
}

function createMetricDelta(
  name: string,
  before: number | null,
  after: number | null,
  unit: string,
  higherIsBetter: boolean
): MetricDelta {
  const delta = before !== null && after !== null ? after - before : null;
  const percentChange =
    before !== null && before !== 0 && delta !== null
      ? (delta / before) * 100
      : null;

  let isImprovement = false;
  if (delta !== null) {
    isImprovement = higherIsBetter ? delta > 0 : delta < 0;
  }

  return {
    name,
    before,
    after,
    delta,
    percentChange,
    isImprovement,
    unit,
  };
}

export function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return "N/A";
  
  if (unit === "ms") {
    return `${Math.round(value)}ms`;
  }
  if (unit === "points") {
    return Math.round(value).toString();
  }
  if (unit === "") {
    return value.toFixed(3);
  }
  return `${value}${unit}`;
}

export function formatDelta(delta: number | null, unit: string): string {
  if (delta === null) return "N/A";
  
  const sign = delta > 0 ? "+" : "";
  if (unit === "ms") {
    return `${sign}${Math.round(delta)}ms`;
  }
  if (unit === "points") {
    return `${sign}${Math.round(delta)}`;
  }
  if (unit === "") {
    return `${sign}${delta.toFixed(3)}`;
  }
  return `${sign}${delta}${unit}`;
}
