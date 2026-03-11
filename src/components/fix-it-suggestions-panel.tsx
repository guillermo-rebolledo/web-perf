"use client";

import { useCompletion } from "@ai-sdk/react";
import { useState } from "react";
import {
  Wrench,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CollapsibleRoot,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatRelativeTime } from "@/lib/dates";
import {
  FIX_IT_SUGGESTIONS,
  type FixItSuggestionsErrorCode,
} from "@/lib/ai/constants";
import { MarkdownSnippet } from "@/components/markdown-snippet";

interface FixItSuggestionsPanelProps {
  alertId: string;
  cachedSuggestions: string | null;
  cachedAt: Date | null;
}

type RateLimitError = FixItSuggestionsErrorCode | null;

function parseCooldownMinutes(cachedAt: Date | null): number {
  if (!cachedAt) return 0;
  const elapsedMinutes = (Date.now() - cachedAt.getTime()) / 60_000;
  return Math.max(
    0,
    Math.ceil(FIX_IT_SUGGESTIONS.COOLDOWN_MINUTES - elapsedMinutes),
  );
}

export function FixItSuggestionsPanel({
  alertId,
  cachedSuggestions,
  cachedAt,
}: FixItSuggestionsPanelProps) {
  const [displaySuggestions, setDisplaySuggestions] = useState<string | null>(
    cachedSuggestions,
  );
  const [displayAt, setDisplayAt] = useState<Date | null>(cachedAt);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { complete, completion, isLoading, error } = useCompletion({
    api: `/api/regressions/${alertId}/code-suggestions`,
    streamProtocol: "text",
    onFinish: (_prompt: string, finalCompletion: string) => {
      setDisplaySuggestions(finalCompletion);
      setDisplayAt(new Date());
      setRateLimitError(null);
    },
    onError: (err) => {
      try {
        const body = JSON.parse(err.message) as { error?: string };
        if (body.error === FIX_IT_SUGGESTIONS.ERROR_CODES.COOLDOWN)
          setRateLimitError(FIX_IT_SUGGESTIONS.ERROR_CODES.COOLDOWN);
        else if (body.error === FIX_IT_SUGGESTIONS.ERROR_CODES.DAILY_LIMIT)
          setRateLimitError(FIX_IT_SUGGESTIONS.ERROR_CODES.DAILY_LIMIT);
        else setRateLimitError(null);
      } catch {
        setRateLimitError(null);
      }
    },
  });

  const handleGenerate = () => {
    setRateLimitError(null);
    setIsOpen(true);
    complete("");
  };

  const minutesLeft = parseCooldownMinutes(displayAt);
  const isCoolingDown = minutesLeft > 0;
  const activeText = isLoading ? completion : displaySuggestions;

  return (
    <CollapsibleRoot open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left rounded-md px-1.5 py-1 -ml-1.5 hover:bg-muted transition-colors cursor-pointer group">
                <Wrench className="size-4 text-slate-600 fill-slate-600 shrink-0" />
                <CardTitle className="text-base tracking-tight">
                  Fix-It Suggestions
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
                {isCoolingDown && displaySuggestions && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground tracking-tighter">
                    <Clock className="size-3" />
                    Available in {minutesLeft}m
                  </span>
                )}
                <Button
                  variant={displaySuggestions ? "outline" : "default"}
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isCoolingDown}
                  className={displaySuggestions ? undefined : "gap-1.5"}
                >
                  {displaySuggestions ? (
                    <>
                      <RefreshCw className="size-3.5" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      Generate Fix Suggestions
                    </>
                  )}
                </Button>
              </div>
            )}

            {isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                <Wrench className="size-3.5 text-secondary" />
                Generating…
              </span>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            {error &&
              rateLimitError === FIX_IT_SUGGESTIONS.ERROR_CODES.DAILY_LIMIT && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Daily limit of {FIX_IT_SUGGESTIONS.DAILY_LIMIT} fix-it
                    generations reached. Resets tomorrow.
                  </span>
                </div>
              )}

            {error &&
              rateLimitError !== FIX_IT_SUGGESTIONS.ERROR_CODES.DAILY_LIMIT && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>Failed to generate suggestions. Please try again.</span>
                </div>
              )}

            {!activeText && !error && !isLoading && (
              <p className="text-sm text-muted-foreground tracking-tighter">
                Generate AI-powered, implementation-ready code fixes tied to the
                root causes of this regression.
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
