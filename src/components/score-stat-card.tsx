"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type ScoreVariant = "good" | "warning" | "poor" | "neutral";

function getScoreVariant(score: number): ScoreVariant {
  if (score >= 90) return "good";
  if (score >= 50) return "warning";
  if (score >= 0) return "poor";
  return "neutral";
}

const variantRingClass: Record<ScoreVariant, string> = {
  good: "text-score-good",
  warning: "text-score-warning",
  poor: "text-score-poor",
  neutral: "text-muted-foreground",
};

const variantRangeLabel: Record<Exclude<ScoreVariant, "neutral">, string> = {
  good: "90–100",
  warning: "50–89",
  poor: "0–49",
};

export interface ScoreStatCardProps {
  score: number | null;
  title: string;
  variant?: ScoreVariant;
  className?: string;
}

export function ScoreStatCard({
  score,
  title,
  variant: variantOverride,
  className,
}: ScoreStatCardProps) {
  const variant =
    variantOverride ?? (score !== null ? getScoreVariant(score) : "neutral");
  const ringClass = variantRingClass[variant];

  const progress = score !== null ? Math.min(100, Math.max(0, score)) / 100 : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden>
            {/* Track */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE_WIDTH}
              className="text-border"
            />
            {/* Progress */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              className={cn("transition-[stroke-dashoffset]", ringClass)}
            />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {score !== null ? Math.round(score) : "N/A"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-xs font-bold uppercase tracking-wide text-foreground">
            {title}
          </span>
          {variant !== "neutral" && (
            <p
              className={cn("text-[10px] leading-tighter font-bold", ringClass)}
            >
              {variantRangeLabel[variant]}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
