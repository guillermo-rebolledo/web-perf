"use client";

import { useCompletion } from "@ai-sdk/react";
import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CollapsibleRoot,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatRelativeTime } from "@/lib/dates";
import { AI_SUMMARY, type AiSummaryErrorCode } from "@/lib/ai/constants";
import { MarkdownSnippet } from "@/components/markdown-snippet";

interface RunAISummaryProps {
  runId: string;
  initialSummary: string | null;
  aiSummaryAt: Date | null;
  aiSummaryModel: string | null;
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
}: RunAISummaryProps) {
  const [displaySummary, setDisplaySummary] = useState<string | null>(
    initialSummary,
  );
  const [displayAt, setDisplayAt] = useState<Date | null>(aiSummaryAt);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError>(null);
  const [isOpen, setIsOpen] = useState(true);

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
        if (body.error === AI_SUMMARY.ERROR_CODES.COOLDOWN)
          setRateLimitError(AI_SUMMARY.ERROR_CODES.COOLDOWN);
        else if (body.error === AI_SUMMARY.ERROR_CODES.DAILY_LIMIT)
          setRateLimitError(AI_SUMMARY.ERROR_CODES.DAILY_LIMIT);
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
    <CollapsibleRoot open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left rounded-md px-1.5 py-1 -ml-1.5 hover:bg-muted transition-colors cursor-pointer group">
                <Sparkles
                  className="size-4 text-violet-500 shrink-0"
                  fill="currentColor"
                />
                <CardTitle className="text-base tracking-tight">
                  AI Analysis
                </CardTitle>
                {displayAt && !isLoading && (
                  <span className="text-xs text-muted-foreground tracking-tighter">
                    Generated {formatRelativeTime(displayAt)}
                  </span>
                )}
                <span className="ml-0.5 flex items-center justify-center rounded border border-border bg-muted/60 p-0.5 group-hover:bg-background transition-colors">
                  <ChevronDown
                    className="size-3 text-muted-foreground transition-transform duration-200 shrink-0"
                    style={{
                      transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  />
                </span>
              </button>
            </CollapsibleTrigger>

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

        <CollapsibleContent>
          <CardContent>
            {error && rateLimitError === AI_SUMMARY.ERROR_CODES.DAILY_LIMIT && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Daily limit of {AI_SUMMARY.DAILY_LIMIT} AI analyses reached.
                  Resets tomorrow.
                </span>
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
                Generate an AI-powered narrative summary with prioritized action
                items for this run.
              </p>
            )}

            {isLoading && !completion && (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
            )}

            {activeText && <MarkdownSnippet md={activeText} />}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </CollapsibleRoot>
  );
}
