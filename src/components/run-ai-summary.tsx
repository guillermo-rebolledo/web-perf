"use client";

import { useCompletion } from "@ai-sdk/react";
import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/dates";
import { AI_SUMMARY, type AiSummaryErrorCode } from "@/lib/ai/constants";

interface RunAISummaryProps {
  runId: string;
  initialSummary: string | null;
  aiSummaryAt: Date | null;
  aiSummaryModel: string | null;
}

/** Minimal markdown renderer — bold, italic, headings, bullet lists */
function MarkdownContent({ text }: { text: string }) {
  const html = text
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1 tracking-tight">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2 tracking-tight">$1</h2>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Unordered list items — handle indented sub-bullets first
    .replace(/^  - (.+)$/gm, '<li class="ml-6 text-sm text-muted-foreground list-disc">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm list-disc">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[\s\S]*?<\/li>(\n|$))+/g, (match) => `<ul class="my-2 space-y-1">${match}</ul>`)
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-4 border-border" />')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-2">')
    .replace(/^(?!<[hul])/, '<p class="text-sm leading-relaxed mb-2">')
    .concat("</p>");

  return (
    <div
      className="prose-sm max-w-none text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_ul]:my-2 [&_li]:my-0.5"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

type RateLimitError = AiSummaryErrorCode | null;

function parseCooldownMinutes(displayAt: Date | null): number {
  if (!displayAt) return 0;
  const elapsedMinutes = (Date.now() - displayAt.getTime()) / 60_000;
  return Math.max(0, Math.ceil(AI_SUMMARY.COOLDOWN_MINUTES - elapsedMinutes));
}

export function RunAISummary({
  runId,
  initialSummary,
  aiSummaryAt,
  aiSummaryModel,
}: RunAISummaryProps) {
  const [displaySummary, setDisplaySummary] = useState<string | null>(initialSummary);
  const [displayAt, setDisplayAt] = useState<Date | null>(aiSummaryAt);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError>(null);

  const { complete, completion, isLoading, error } = useCompletion({
    api: `/api/runs/${runId}/ai-summary`,
    streamProtocol: "text",
    onFinish: (prompt: string, finalCompletion: string) => {
      setDisplaySummary(finalCompletion);
      setDisplayAt(new Date());
      setRateLimitError(null);
    },
    onError: (err) => {
      try {
        const body = JSON.parse(err.message) as { error?: string };
        if (body.error === AI_SUMMARY.ERROR_CODES.COOLDOWN) setRateLimitError(AI_SUMMARY.ERROR_CODES.COOLDOWN);
        else if (body.error === AI_SUMMARY.ERROR_CODES.DAILY_LIMIT) setRateLimitError(AI_SUMMARY.ERROR_CODES.DAILY_LIMIT);
        else setRateLimitError(null);
      } catch {
        setRateLimitError(null);
      }
    },
  });

  const handleGenerate = () => {
    setRateLimitError(null);
    complete("");
  };

  const minutesLeft = parseCooldownMinutes(displayAt);
  const isCoolingDown = minutesLeft > 0;
  const activeText = isLoading ? completion : displaySummary;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            <CardTitle className="text-base tracking-tight">AI Analysis</CardTitle>
            {displayAt && !isLoading && (
              <span className="text-xs text-muted-foreground tracking-tighter">
                Generated {formatRelativeTime(displayAt)}
                {aiSummaryModel ? ` · ${aiSummaryModel}` : ""}
              </span>
            )}
          </div>

          {!isLoading && (
            <div className="flex items-center gap-2">
              {isCoolingDown && displaySummary && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground tracking-tighter">
                  <Clock className="size-3" />
                  Available in {minutesLeft}m
                </span>
              )}
              <Button
                variant={displaySummary ? "outline" : "default"}
                size="sm"
                onClick={handleGenerate}
                disabled={isCoolingDown}
                className={displaySummary ? undefined : "gap-1.5"}
              >
                {displaySummary ? (
                  <>
                    <RefreshCw className="size-3.5" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Generate AI Analysis
                  </>
                )}
              </Button>
            </div>
          )}

          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <Sparkles className="size-3.5 text-violet-500" />
              Generating…
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error && rateLimitError === AI_SUMMARY.ERROR_CODES.DAILY_LIMIT && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>Daily limit of {AI_SUMMARY.DAILY_LIMIT} AI analyses reached. Resets tomorrow.</span>
          </div>
        )}

        {error && rateLimitError !== AI_SUMMARY.ERROR_CODES.DAILY_LIMIT && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>Failed to generate analysis. Please try again.</span>
          </div>
        )}

        {!activeText && !error && !isLoading && (
          <p className="text-sm text-muted-foreground tracking-tighter">
            Generate an AI-powered narrative summary with prioritized action items for this run.
          </p>
        )}

        {isLoading && !completion && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-5/6" />
          </div>
        )}

        {activeText && (
          <MarkdownContent text={activeText} />
        )}
      </CardContent>
    </Card>
  );
}
