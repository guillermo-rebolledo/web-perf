import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FIX_IT_SUGGESTIONS } from "@/lib/ai/constants";
import { isFeatureEnabled } from "@/lib/posthog-server";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildFixItSuggestionsPrompt,
  getRelevantAuditIds,
} from "@/lib/ai/prompt-builder";
import { parseRegressionCauses, parseDiffSummary } from "@/lib/alert-utils";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:regressions");

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await params;

  // 1. Auth — session only (UI-triggered feature)
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Fetch alert + ownership check (include audits for the run)
  const alert = await prisma.regressionAlert.findUnique({
    where: { id: alertId },
    include: {
      run: {
        include: {
          monitor: { include: { site: true } },
          audits: true,
        },
      },
    },
  });

  if (!alert || alert.run.monitor.site.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (alert.run.status !== "success") {
    return new Response(JSON.stringify({ error: "Run not complete" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Feature flag
  const featureEnabled = await isFeatureEnabled(
    FEATURE_FLAGS.FIX_IT_SUGGESTIONS,
    session.user.id,
    { defaultValue: true },
  );
  if (!featureEnabled) {
    return new Response(JSON.stringify({ error: "Not available" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Per-alert cooldown
  if (alert.fixItSuggestionsAt) {
    const elapsedMs = Date.now() - alert.fixItSuggestionsAt.getTime();
    const cooldownMs = FIX_IT_SUGGESTIONS.COOLDOWN_MINUTES * 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return new Response(
        JSON.stringify({
          error: FIX_IT_SUGGESTIONS.ERROR_CODES.COOLDOWN,
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

  // 5. Per-user daily limit
  const rateLimit = await checkRateLimit(
    session.user.id,
    FIX_IT_SUGGESTIONS.DAILY_LIMIT,
    FIX_IT_SUGGESTIONS.RATE_LIMIT_KEY,
  );
  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({
        error: FIX_IT_SUGGESTIONS.ERROR_CODES.DAILY_LIMIT,
        limit: FIX_IT_SUGGESTIONS.DAILY_LIMIT,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // 6. Filter audits to only those relevant to the detected causes
  const causes = parseRegressionCauses(alert.likelyCauses);
  const diffSummary = parseDiffSummary(alert.diffSummary);
  const relevantAuditIds = getRelevantAuditIds(causes.map((c) => c.id));
  const relevantAudits = alert.run.audits.filter((a) =>
    relevantAuditIds.includes(a.auditId),
  );

  // 7. Build prompt + stream
  const prompt = buildFixItSuggestionsPrompt(
    alert,
    causes,
    diffSummary,
    relevantAudits,
    alert.run.monitor.site,
    alert.run.monitor.strategy,
  );

  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

  const result = streamText({
    model: openai(FIX_IT_SUGGESTIONS.MODEL),
    prompt,
    onFinish: async ({ text }) => {
      await prisma.regressionAlert.update({
        where: { id: alertId },
        data: {
          fixItSuggestions: text,
          fixItSuggestionsAt: new Date(),
          fixItSuggestionsModel: FIX_IT_SUGGESTIONS.MODEL,
        },
      });
    },
    onError: (err) => {
      log.error("Failed to save fix-it suggestions", err, { alertId });
    },
  });

  return result.toTextStreamResponse();
}
