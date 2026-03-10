import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { PATTERN_INSIGHT } from "@/lib/ai/constants";
import { buildPatternAnalysisPrompt } from "@/lib/ai/prompt-builder";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/env";

/**
 * Computes a deterministic SHA-256 hash of the alert data used as input.
 * Used for cache invalidation — regenerate only when source data changes.
 */
function computeInputHash(
  alerts: Array<{ id: string; metricName: string; likelyCauses: unknown }>
): string {
  const sorted = [...alerts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => ({ id: a.id, metricName: a.metricName, likelyCauses: a.likelyCauses }));
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex");
}

/**
 * Parses the dominant cause ID from the LLM output.
 * Expects a machine-readable marker: <!-- DOMINANT_CAUSE: <id> -->
 * Falls back to "unknown" if the marker is absent.
 */
function parseDominantCause(text: string): string {
  const match = text.match(/<!--\s*DOMINANT_CAUSE:\s*(.+?)\s*-->/);
  return match ? match[1].trim() : "unknown";
}

/**
 * Parses the recommendation section from the LLM output.
 * Extracts content under the "### Recommendation" heading.
 */
function parseRecommendation(text: string): string {
  const match = text.match(/###\s+Recommendation\s*\n([\s\S]*?)(?=\n###|<!--|\s*$)/);
  return match ? match[1].trim() : "";
}

/**
 * Generates (or refreshes) a cross-run pattern insight for a monitor.
 *
 * Guards:
 * - Skips if fewer than MIN_REGRESSIONS alerts exist in the lookback window
 * - Skips if a Redis lock is already held (prevents concurrent generation)
 * - Skips if the cached insight is fresh AND the input hash is unchanged
 * - Respects a per-user daily generation limit
 *
 * Safe to call fire-and-forget — never throws.
 */
export async function generatePatternInsight(
  monitorId: string,
  userId: string
): Promise<void> {
  try {
    // Per-user daily generation cap
    const rateLimit = await checkRateLimit(
      userId,
      PATTERN_INSIGHT.GENERATION_DAILY_LIMIT,
      PATTERN_INSIGHT.RATE_LIMIT_GEN_KEY
    );
    if (!rateLimit.success) {
      console.log(
        `[AI] Pattern insight daily limit reached for user ${userId}`
      );
      return;
    }

    // Acquire Redis lock to prevent concurrent generation for the same monitor
    const lockKey = `lock:pattern-insight:${monitorId}`;
    const acquired = await redis.set(
      lockKey,
      "1",
      "EX",
      PATTERN_INSIGHT.GENERATION_LOCK_TTL_SECONDS,
      "NX"
    );
    if (!acquired) {
      console.log(
        `[AI] Pattern insight generation already in progress for monitor ${monitorId}`
      );
      return;
    }

    const lookbackDate = new Date(
      Date.now() - PATTERN_INSIGHT.LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );

    // Fetch regression alerts within the lookback window
    const alerts = await prisma.regressionAlert.findMany({
      where: {
        run: { monitorId },
        createdAt: { gte: lookbackDate },
      },
      include: {
        run: {
          select: {
            completedAt: true,
            monitor: { include: { site: { select: { name: true, url: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (alerts.length < PATTERN_INSIGHT.MIN_REGRESSIONS) {
      return;
    }

    const inputHash = computeInputHash(
      alerts.map((a) => ({
        id: a.id,
        metricName: a.metricName,
        likelyCauses: a.likelyCauses,
      }))
    );

    // Check for an existing fresh insight with the same input data
    const staleThreshold = new Date(
      Date.now() - PATTERN_INSIGHT.STALENESS_HOURS * 60 * 60 * 1000
    );
    const existingInsight = await prisma.monitorInsight.findFirst({
      where: { monitorId, metricName: null },
      orderBy: { generatedAt: "desc" },
    });

    if (
      existingInsight &&
      existingInsight.inputHash === inputHash &&
      existingInsight.generatedAt > staleThreshold
    ) {
      return; // Insight is fresh and data hasn't changed
    }

    const firstAlert = alerts[0];
    const siteName = firstAlert.run.monitor.site.name;
    const siteUrl = firstAlert.run.monitor.site.url;

    const prompt = buildPatternAnalysisPrompt(
      alerts.map((a) => ({
        id: a.id,
        metricName: a.metricName,
        severity: a.severity,
        percentChange: a.percentChange,
        createdAt: a.createdAt,
        likelyCauses: a.likelyCauses,
        run: { completedAt: a.run.completedAt },
      })),
      siteName,
      siteUrl
    );

    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const { text } = await generateText({
      model: openai(PATTERN_INSIGHT.MODEL),
      prompt,
    });

    const dominantCause = parseDominantCause(text);
    const recommendation = parseRecommendation(text);

    // Upsert: update existing cross-metric insight or create a new one
    if (existingInsight) {
      await prisma.monitorInsight.update({
        where: { id: existingInsight.id },
        data: {
          generatedAt: new Date(),
          summary: text,
          recurrenceCount: alerts.length,
          dominantCause,
          recommendation,
          model: PATTERN_INSIGHT.MODEL,
          inputHash,
        },
      });
    } else {
      await prisma.monitorInsight.create({
        data: {
          monitorId,
          metricName: null, // cross-metric
          summary: text,
          recurrenceCount: alerts.length,
          dominantCause,
          recommendation,
          model: PATTERN_INSIGHT.MODEL,
          inputHash,
        },
      });
    }

    console.log(
      `[AI] Pattern insight generated for monitor ${monitorId} (${alerts.length} alerts, dominant cause: ${dominantCause})`
    );
  } catch (err) {
    console.error(
      `[AI] Pattern insight generation error for monitor ${monitorId}:`,
      err
    );
    // Never throw — fire-and-forget callers must not crash
  }
}
