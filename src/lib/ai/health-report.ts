import { prisma } from "@/lib/prisma";
import { HEALTH_REPORT } from "@/lib/ai/constants";
import { buildHealthReportPrompt } from "@/lib/ai/prompt-builder";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("AI:HealthReport");

/**
 * Generates an initial site health report for the first successful run of a monitor.
 *
 * Guards:
 * - Skips if the run already has a health report (idempotency)
 * - Skips if the run is not in `success` status
 * - Respects a per-user daily generation limit
 * - Checks the HEALTH_REPORT feature flag (PostHog) before calling OpenAI
 *
 * Safe to call fire-and-forget — never throws.
 */
export async function generateHealthReport(
  runId: string,
  userId: string
): Promise<void> {
  try {
    // Feature flag check (worker context — default false until flag is enabled)
    const { isFeatureEnabled } = await import("@/lib/posthog-server");
    const { FEATURE_FLAGS } = await import("@/lib/feature-flags");
    const flagEnabled = await isFeatureEnabled(
      FEATURE_FLAGS.HEALTH_REPORT,
      userId,
      { defaultValue: false }
    );
    if (!flagEnabled) {
      log.debug("Skipped: HEALTH_REPORT flag disabled", { runId });
      return;
    }

    // Per-user daily cap
    const rateLimit = await checkRateLimit(
      userId,
      HEALTH_REPORT.DAILY_LIMIT,
      HEALTH_REPORT.RATE_LIMIT_KEY
    );
    if (!rateLimit.success) {
      log.info("Daily generation limit reached", { userId });
      return;
    }

    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
        monitor: { include: { site: true } },
        audits: { orderBy: { score: "asc" } },
        insights: { orderBy: { score: "asc" } },
        regressionAlerts: { orderBy: { severity: "desc" } },
      },
    });

    if (!run) return;

    // Idempotency guard — do not regenerate if already set
    if (run.healthReport) {
      return;
    }

    if (run.status !== "success") {
      return;
    }

    const prompt = buildHealthReportPrompt({
      finalUrl: run.finalUrl,
      monitor: {
        strategy: run.monitor.strategy,
        site: {
          url: run.monitor.site.url,
          name: run.monitor.site.name,
        },
      },
      performanceScore: run.performanceScore,
      accessibilityScore: run.accessibilityScore,
      bestPracticesScore: run.bestPracticesScore,
      seoScore: run.seoScore,
      lcp: run.lcp,
      inp: run.inp,
      tbt: run.tbt,
      cls: run.cls,
      fcp: run.fcp,
      ttfb: run.ttfb,
      speedIndex: run.speedIndex,
      tti: run.tti,
      totalByteWeight: run.totalByteWeight,
      numRequests: run.numRequests,
      mainThreadWork: run.mainThreadWork,
      regressionAlerts: run.regressionAlerts.map((a) => ({
        metricName: a.metricName,
        severity: a.severity,
        confidence: a.confidence as "low" | "medium" | "high",
        percentChange: a.percentChange,
        likelyCauses: a.likelyCauses,
      })),
      insights: run.insights.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        score: i.score,
        scored: i.scored,
        displayValue: i.displayValue,
        metricSavings: i.metricSavings,
        sources: i.sources,
      })),
      audits: run.audits.map((a) => ({
        id: a.id,
        title: a.title,
        score: a.score,
        scored: a.scored,
        displayValue: a.displayValue,
      })),
    });

    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const { text } = await generateText({
      model: openai(HEALTH_REPORT.MODEL),
      prompt,
    });

    await prisma.run.update({
      where: { id: runId },
      data: {
        healthReport: text,
        healthReportAt: new Date(),
        healthReportModel: HEALTH_REPORT.MODEL,
      },
    });

    log.info("Health report generated", { runId });
  } catch (err) {
    log.error("Health report generation error", err, { runId });
    // Never throw — fire-and-forget callers must not crash
  }
}
