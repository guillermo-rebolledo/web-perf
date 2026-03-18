import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/resolve-user";
import { prisma } from "@/lib/prisma";
import { PATTERN_INSIGHT } from "@/lib/ai/constants";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { isFeatureEnabled } from "@/lib/posthog-server";
import { checkRateLimit } from "@/lib/rate-limit";
import type { PatternInsightsResult } from "@/types/api";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:monitors");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: monitorId } = await params;

  const userId = await resolveUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag check — default true for UI reads
  const featureEnabled = await isFeatureEnabled(
    FEATURE_FLAGS.PATTERN_INSIGHT,
    userId,
    { defaultValue: true }
  );
  if (!featureEnabled) {
    return NextResponse.json({ error: "Feature not available" }, { status: 403 });
  }

  // Per-user daily API rate limit
  const rateLimit = await checkRateLimit(
    userId,
    PATTERN_INSIGHT.API_DAILY_LIMIT,
    PATTERN_INSIGHT.RATE_LIMIT_KEY
  );
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", limit: PATTERN_INSIGHT.API_DAILY_LIMIT },
      { status: 429 }
    );
  }

  // Verify monitor ownership
  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId },
    include: { site: { select: { userId: true } } },
  });

  if (!monitor || monitor.site.userId !== userId) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  // Fetch cached insights
  const insights = await prisma.monitorInsight.findMany({
    where: { monitorId },
    orderBy: { generatedAt: "desc" },
  });

  // Determine if generation should be triggered
  let isGenerating = false;
  const staleThreshold = new Date(
    Date.now() - PATTERN_INSIGHT.STALENESS_HOURS * 60 * 60 * 1000
  );

  const shouldGenerate =
    insights.length === 0 ||
    insights[0].generatedAt < staleThreshold;

  if (shouldGenerate) {
    isGenerating = true;
    void (async () => {
      try {
        const { generatePatternInsight } = await import(
          "@/lib/ai/pattern-insight"
        );
        await generatePatternInsight(monitorId, userId);
      } catch (err) {
        log.error("Pattern insight background generation error", err, { monitorId });
      }
    })();
  }

  const result: PatternInsightsResult = {
    insights: insights.map((insight) => ({
      id: insight.id,
      monitorId: insight.monitorId,
      metricName: insight.metricName,
      generatedAt: insight.generatedAt.toISOString(),
      summary: insight.summary,
      recurrenceCount: insight.recurrenceCount,
      dominantCause: insight.dominantCause,
      recommendation: insight.recommendation,
      model: insight.model,
    })),
    isGenerating,
  };

  return NextResponse.json(result);
}
