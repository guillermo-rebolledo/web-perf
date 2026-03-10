"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CollapsibleRoot,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Sparkles, TrendingUp } from "lucide-react";
import { formatRelativeTime } from "@/lib/dates";
import { MarkdownSnippet } from "@/components/markdown-snippet";
import type { PatternInsightItem } from "@/types/api";

interface PatternInsightCardProps {
  insight: PatternInsightItem;
}

/**
 * Displays a single cross-run regression pattern insight.
 * Uses amber color treatment to distinguish from the violet AI summary card —
 * signals "recurring pattern alert" rather than "on-demand analysis".
 * Collapsible — open by default.
 */
export function PatternInsightCard({ insight }: PatternInsightCardProps) {
  const [open, setOpen] = useState(true);
  const cleanSummary = insight.summary
    .replace(/<!--\s*DOMINANT_CAUSE:[^>]*-->/g, "")
    .trim();

  return (
    <CollapsibleRoot open={open} onOpenChange={setOpen}>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left rounded-md px-1.5 py-1 -ml-1.5 hover:bg-amber-500/10 transition-colors cursor-pointer group">
                <div className="p-1.5 bg-amber-500/10 rounded-md shrink-0">
                  <TrendingUp className="size-4 text-amber-500" />
                </div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Recurring Pattern Detected
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400"
                >
                  {insight.recurrenceCount} regressions
                </Badge>
                <span className="ml-0.5 flex items-center justify-center rounded border border-border bg-muted/60 p-0.5 group-hover:bg-background transition-colors">
                  <ChevronDown
                    className="size-3 text-muted-foreground transition-transform duration-200 shrink-0"
                    style={{
                      transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  />
                </span>
              </button>
            </CollapsibleTrigger>

            <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1">
              <Sparkles
                className="size-4 text-violet-500 shrink-0"
                fill="currentColor"
              />
              {formatRelativeTime(new Date(insight.generatedAt))}
            </span>
          </div>

          {insight.dominantCause !== "unknown" && (
            <p className="text-xs text-muted-foreground mt-1 pl-1.5">
              Dominant cause:{" "}
              <span className="font-mono text-amber-600 dark:text-amber-400">
                {insight.dominantCause}
              </span>
            </p>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <MarkdownSnippet md={cleanSummary} />

            {insight.recommendation && (
              <div className="p-3 bg-amber-500/10 rounded-md border border-amber-500/20">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                  Recommended Fix
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insight.recommendation}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </CollapsibleRoot>
  );
}
