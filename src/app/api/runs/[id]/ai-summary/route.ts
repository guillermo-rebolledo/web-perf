import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RunStatus } from "@prisma/client";
import { buildRunAnalysisPrompt } from "@/lib/ai/prompt-builder";
import { AI_SUMMARY } from "@/lib/ai/constants";
import { isFeatureEnabled } from "@/lib/posthog-server";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:runs");

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const run = await prisma.run.findFirst({
    where: { id },
    include: {
      monitor: { include: { site: true } },
      regressionAlerts: { orderBy: { severity: "desc" } },
      insights: { orderBy: { score: "asc" } },
      audits: { orderBy: { score: "asc" } },
    },
  });

  if (!run || run.monitor.site.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const featureEnabled = await isFeatureEnabled(
    FEATURE_FLAGS.RUN_AI_SUMMARY,
    session.user.id,
    { defaultValue: true },
  );
  if (!featureEnabled) {
    return new Response(JSON.stringify({ error: "Feature not available" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (run.status !== RunStatus.success) {
    return new Response(
      JSON.stringify({
        error: "AI analysis is only available for successful runs",
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  // Per-run cooldown: must wait AI_SUMMARY.COOLDOWN_MINUTES between regenerations
  if (run.aiSummaryAt) {
    const elapsedMs = Date.now() - run.aiSummaryAt.getTime();
    const cooldownMs = AI_SUMMARY.COOLDOWN_MINUTES * 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return new Response(
        JSON.stringify({
          error: AI_SUMMARY.ERROR_CODES.COOLDOWN,
          retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds),
          },
        },
      );
    }
  }

  // Per-user daily cap
  const rateLimit = await checkRateLimit(
    session.user.id,
    AI_SUMMARY.DAILY_LIMIT,
    AI_SUMMARY.RATE_LIMIT_KEY,
  );
  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({
        error: AI_SUMMARY.ERROR_CODES.DAILY_LIMIT,
        limit: AI_SUMMARY.DAILY_LIMIT,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const prompt = buildRunAnalysisPrompt(run);

  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

  const result = streamText({
    model: openai(AI_SUMMARY.MODEL),
    prompt,
    onFinish: async ({ text }) => {
      await prisma.run.update({
        where: { id },
        data: {
          aiSummary: text,
          aiSummaryAt: new Date(),
          aiSummaryModel: AI_SUMMARY.MODEL,
        },
      });
    },
    onError: (err) => {
      log.error("Failed to save AI summary", err, { runId: id });
    },
  });

  return result.toTextStreamResponse();
}
