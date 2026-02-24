import { cn } from "@/lib/utils";
import { Thresholds } from "@/components/score-badge";

type MetricVariant = "good" | "warning" | "poor" | "neutral";
type MetricCardProps = {
  title: string;
  subtitle?: string;
  value: number | null;
  unit: string;
  thresholds?: Thresholds;
  description?: string;
  variant?: MetricVariant;
  lowerIsBetter?: boolean;
};

const variantTextClass: Record<MetricVariant, string> = {
  good: "text-score-good",
  warning: "text-score-warning",
  poor: "text-score-poor",
  neutral: "text-muted-foreground",
};

const variantBorderClass: Record<MetricVariant, string> = {
  good: "border-l-score-good",
  warning: "border-l-score-warning",
  poor: "border-l-score-poor",
  neutral: "border-l-muted-foreground",
};

function getScoreVariant(score: number): MetricVariant {
  if (score >= 90) return "good";
  if (score >= 50) return "warning";
  if (score >= 0) return "poor";
  return "neutral";
}

export function MetricCard({
  title,
  subtitle,
  value,
  unit,
  thresholds,
  variant: variantOverride,
  lowerIsBetter = true,
}: MetricCardProps) {
  let variant: MetricVariant =
    variantOverride ?? (value !== null ? getScoreVariant(value) : "neutral");

  if (thresholds && value !== null) {
    if (lowerIsBetter) {
      variant =
        value <= thresholds.good
          ? "good"
          : value <= thresholds.needsImprovement
            ? "warning"
            : "poor";
    } else {
      variant =
        value >= thresholds.good
          ? "good"
          : value >= thresholds.needsImprovement
            ? "warning"
            : "poor";
    }
  }

  const displayValue =
    value !== null
      ? unit === "ms"
        ? Math.round(value)
        : unit === ""
          ? value.toFixed(3)
          : value
      : "--";

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-l-4 bg-card shadow flex flex-col gap-2 select-none",
        variantBorderClass[variant],
      )}
    >
      <div className="flex flex-col">
        <span className="text-sm font-semibold leading-tight text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="text-xs leading-tight text-muted-foreground -mt-1">
            {subtitle}
          </span>
        )}
      </div>
      <div className="mt-auto flex items-baseline gap-1 font-geist-mono leading-none tracking-tighter">
        <span
          className={cn(
            "text-2xl font-bold tracking-tight",
            variantTextClass[variant],
          )}
        >
          {displayValue}
        </span>
        {value !== null && (
          <span className="text-sm text-slate-500 font-medium">{unit}</span>
        )}
      </div>
    </div>
  );
}
