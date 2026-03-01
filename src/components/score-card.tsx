import { ElementType } from "react";
import { cn } from "@/lib/utils";
import {
  getScoreVariant,
  scoreVariantBgClass,
  scoreVariantClass,
} from "@/lib/score";
import { Card, CardContent } from "@/components/ui/card";

export function ScoreCard({
  score,
  title,
  icon: Icon,
  average,
}: {
  score: number | null;
  title: string;
  icon?: ElementType;
  /** Optional period average shown below the progress bar for comparison. */
  average?: number | null;
}) {
  const variant = score !== null ? getScoreVariant(score) : "neutral";
  const scoreClassName = scoreVariantClass[variant];
  const bgClassName = scoreVariantBgClass[variant];

  const progress = score ?? 0;

  const avgVariant = average !== null && average !== undefined ? getScoreVariant(average) : "neutral";
  const avgColorClass = scoreVariantClass[avgVariant];

  return (
    <Card className="col-span-1">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center min-w-0">
          <span className="uppercase text-xs text-muted-foreground font-semibold tracking-tighter">
            {title}
          </span>
          {Icon && <Icon className={cn(scoreClassName, "size-4")} />}
        </div>
        <span className="text-4xl font-extrabold tabular-nums text-foreground">
          {score ? Math.round(score) : "--"}
        </span>
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(bgClassName, "h-full rounded-full transition-all")}
            style={{ width: `${progress}%` }}
          />
        </div>
        {average !== null && average !== undefined && (
          <p className="mt-2 text-xs text-muted-foreground">
            Period avg:{" "}
            <span className={cn(avgColorClass, "font-semibold tabular-nums")}>
              {Math.round(average)}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
