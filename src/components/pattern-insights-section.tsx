import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/posthog-server";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { PATTERN_INSIGHT } from "@/lib/ai/constants";
import { PatternInsightCard } from "@/components/pattern-insight-card";
import type { PatternInsightItem } from "@/types/api";

interface PatternInsightsSectionProps {
  monitorId: string;
  userId: string;
}

/**
 * Async server component that reads pattern insights directly from the database.
 * Renders nothing when no insights exist.
 * Wrapped in Suspense by the parent — never blocks page load.
 */
export async function PatternInsightsSection({
  monitorId,
  userId,
}: PatternInsightsSectionProps) {
  const featureEnabled = await isFeatureEnabled(
    FEATURE_FLAGS.PATTERN_INSIGHT,
    userId,
    { defaultValue: true }
  );
  if (!featureEnabled) return null;

  let insights: PatternInsightItem[];
  try {
    // Only show insights while the pattern is still active — hide once the
    // site recovers and recent regressions drop below the generation threshold.
    const lookbackDate = new Date(
      Date.now() - PATTERN_INSIGHT.LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );
    const recentAlertCount = await prisma.regressionAlert.count({
      where: { run: { monitorId }, createdAt: { gte: lookbackDate } },
    });
    if (recentAlertCount < PATTERN_INSIGHT.MIN_REGRESSIONS) return null;

    const rows = await prisma.monitorInsight.findMany({
      where: { monitorId },
      orderBy: { generatedAt: "desc" },
    });
    insights = rows.map((row) => ({
      id: row.id,
      monitorId: row.monitorId,
      metricName: row.metricName,
      generatedAt: row.generatedAt.toISOString(),
      summary: row.summary,
      recurrenceCount: row.recurrenceCount,
      dominantCause: row.dominantCause,
      recommendation: row.recommendation,
      model: row.model,
    }));
  } catch {
    return null;
  }

  if (insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {insights.map((insight) => (
        <PatternInsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
