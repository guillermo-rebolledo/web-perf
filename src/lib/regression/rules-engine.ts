import { PrismaClient, Run, RunStatus } from "@prisma/client";
import type { DiffSummary } from "./diff-engine";
import { calculateDiffSummary } from "./diff-engine";

const prisma = new PrismaClient();

/**
 * Evidence item for a root cause
 */
export interface EvidenceItem {
  type: "metric" | "audit" | "resource" | "insight";
  label: string;
  before: string | number;
  after: string | number;
  delta: string | number;
}

/**
 * Root cause with ranked confidence and evidence
 */
export interface RootCause {
  id: string; // "js-bloat", "third-party", etc.
  title: string;
  description: string;
  confidence: number; // 0-100
  estimatedImpact: number; // Estimated ms impact
  evidence: EvidenceItem[];
  recommendations: string[];
}

/**
 * Regression rule interface
 */
export interface RegressionRule {
  id: string;
  appliesTo: string[]; // Metrics this rule applies to: ["lcp", "tbt", etc.]
  detect: (
    metricName: string,
    currentRun: Run,
    baselineRun: Run | null,
    diffSummary: DiffSummary,
    currentInsights: Array<{ insightId: string; sources?: unknown; score?: number | null }>,
    baselineInsights: Array<{ insightId: string; sources?: unknown; score?: number | null }>,
  ) => RootCause | null;
}

/**
 * Calculate ranking score for a root cause
 * Higher score = more likely to be the true cause
 */
function calculateRankingScore(cause: RootCause): number {
  return cause.confidence * cause.estimatedImpact * cause.evidence.length;
}

/**
 * Analyze root causes for a regression
 *
 * This function:
 * 1. Calculates diff summary
 * 2. Loads baseline run and insights
 * 3. Applies all rules (filtered by metric)
 * 4. Ranks by: confidence × estimatedImpact × evidence.length
 * 5. Returns top 5 causes
 *
 * @param metricName - The metric that regressed
 * @param currentRun - The run with regression
 * @param prismaClient - Optional Prisma client
 * @returns Array of ranked root causes (top 5)
 */
export async function analyzeRootCauses(
  metricName: string,
  currentRun: Run,
  prismaClient?: PrismaClient,
): Promise<RootCause[]> {
  const db = prismaClient || prisma;

  // Calculate diff summary
  const diffSummary = await calculateDiffSummary(currentRun, db);

  // Load baseline run
  const baselineRun = await db.run.findFirst({
    where: {
      monitorId: currentRun.monitorId,
      status: RunStatus.success,
      completedAt: { lt: currentRun.completedAt || new Date() },
    },
    orderBy: {
      completedAt: "desc",
    },
  });

  // Load insights for both runs
  const currentInsights = await db.insight.findMany({
    where: { runId: currentRun.id },
  });

  const baselineInsights = baselineRun
    ? await db.insight.findMany({
        where: { runId: baselineRun.id },
      })
    : [];

  // Import all rules
  const { default: jsBloatRule } = await import("./rules/js-bloat-rule");
  const { default: thirdPartyRule } = await import("./rules/third-party-rule");
  const { default: lcpResourceRule } = await import("./rules/lcp-resource-rule");
  const { default: ttfbRule } = await import("./rules/ttfb-rule");
  const { default: clsRule } = await import("./rules/cls-rule");
  const { default: renderBlockingRule } = await import("./rules/render-blocking-rule");
  const { default: mainThreadRule } = await import("./rules/main-thread-rule");
  const { default: legacyJsRule } = await import("./rules/legacy-js-rule");

  const rules: RegressionRule[] = [
    jsBloatRule,
    thirdPartyRule,
    lcpResourceRule,
    ttfbRule,
    clsRule,
    renderBlockingRule,
    mainThreadRule,
    legacyJsRule,
  ];

  // Apply all rules that match this metric
  const causes: RootCause[] = [];

  for (const rule of rules) {
    if (!rule.appliesTo.includes(metricName)) {
      continue; // Rule doesn't apply to this metric
    }

    const cause = rule.detect(
      metricName,
      currentRun,
      baselineRun,
      diffSummary,
      currentInsights,
      baselineInsights,
    );

    if (cause) {
      causes.push(cause);
    }
  }

  // Rank by score and return top 5
  causes.sort((a, b) => calculateRankingScore(b) - calculateRankingScore(a));
  return causes.slice(0, 5);
}
