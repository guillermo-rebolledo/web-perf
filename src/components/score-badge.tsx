import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number | null;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <Badge variant="outline" className={className}>
        N/A
      </Badge>
    );
  }

  const variant = score >= 90 ? "success" : score >= 50 ? "warning" : "poor";

  return (
    <Badge variant={variant} className={className}>
      {Math.round(score)}
    </Badge>
  );
}

interface MetricBadgeProps {
  label: string;
  description?: string;
  value: number | null | undefined;
  unit: string;
  thresholds?: {
    good: number;
    needsImprovement: number;
  };
  lowerIsBetter?: boolean;
  className?: string;
}

export function MetricBadge({
  label,
  description,
  value,
  unit,
  thresholds,
  lowerIsBetter = true,
  className,
}: MetricBadgeProps) {
  if (value === null || value === undefined) {
    return (
      <div className={cn("flex flex-col gap-1 select-none", className)}>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {description && (
          <span className="text-[10px] leading-tight text-muted-foreground/70">{description}</span>
        )}
        <Badge variant="outline">N/A</Badge>
      </div>
    );
  }

  let variant: "success" | "warning" | "poor" | "outline" = "outline";

  if (thresholds) {
    if (lowerIsBetter) {
      variant =
        value <= thresholds.good
          ? "success"
          : value <= thresholds.needsImprovement
            ? "warning"
            : "poor";
    } else {
      variant =
        value >= thresholds.good
          ? "success"
          : value >= thresholds.needsImprovement
            ? "warning"
            : "poor";
    }
  }

  const displayValue =
    unit === "ms"
      ? `${Math.round(value)}ms`
      : unit === ""
        ? value.toFixed(3)
        : `${value}${unit}`;

  return (
    <div className={cn("flex flex-col gap-1 select-none", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {description && (
        <span className="text-[10px] leading-tight text-muted-foreground/70">{description}</span>
      )}
      <Badge variant={variant}>{displayValue}</Badge>
    </div>
  );
}
