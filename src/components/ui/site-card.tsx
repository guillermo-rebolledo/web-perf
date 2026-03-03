import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Monitor, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SiteWithMonitorsAndRuns } from "@/types/prisma";
import { cn } from "@/lib/utils";

type MetricVariant = "good" | "warning" | "poor" | "neutral";

const metricVariantClass: Record<MetricVariant, string> = {
  good: "text-score-good",
  warning: "text-score-warning",
  poor: "text-score-poor",
  neutral: "text-muted-foreground",
};

function getMetricVariant(
  value: number | null,
  thresholds: { good: number; needsImprovement: number },
  lowerIsBetter = true,
): MetricVariant {
  if (value === null) return "neutral";
  if (lowerIsBetter) {
    return value <= thresholds.good
      ? "good"
      : value <= thresholds.needsImprovement
        ? "warning"
        : "poor";
  }
  return value >= thresholds.good
    ? "good"
    : value >= thresholds.needsImprovement
      ? "warning"
      : "poor";
}

function InlineMetric({
  label,
  value,
  format,
  thresholds,
  lowerIsBetter = true,
}: {
  label: string;
  value: number | null;
  format: (v: number) => string;
  thresholds: { good: number; needsImprovement: number };
  lowerIsBetter?: boolean;
}) {
  const variant = getMetricVariant(value, thresholds, lowerIsBetter);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-bold font-geist-mono tabular-nums leading-none",
          metricVariantClass[variant],
        )}
      >
        {value !== null ? format(value) : "—"}
      </span>
    </div>
  );
}

export function SiteCard({ site }: { site: SiteWithMonitorsAndRuns }) {
  const latestRun = site.monitors
    .flatMap((m) => m.runs)
    .sort(
      (a, b) =>
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
    )[0];

  const strategies = [...new Set(site.monitors.map((m) => m.strategy))];

  return (
    <Link href={`/sites/${site.id}`} className="h-full block">
      <Card className="transition-shadow hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex flex-col h-full">
        <CardHeader>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="line-clamp-1 font-inter tracking-tighter font-semibold">
                {site.name}
              </CardTitle>
              <CardDescription className="line-clamp-1 text-xs text-muted-foreground/50 dark:text-muted-foreground/90 font-geist-mono tracking-tighter">
                {site.url}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <div className="px-6 py-3 grid grid-cols-4 gap-4">
          <InlineMetric
            label="Perf."
            value={latestRun?.performanceScore ?? null}
            format={(v) => String(Math.round(v))}
            thresholds={{ good: 90, needsImprovement: 50 }}
            lowerIsBetter={false}
          />
          <InlineMetric
            label="A11y"
            value={latestRun?.accessibilityScore ?? null}
            format={(v) => String(Math.round(v))}
            thresholds={{ good: 90, needsImprovement: 50 }}
            lowerIsBetter={false}
          />
          <InlineMetric
            label="SEO"
            value={latestRun?.seoScore ?? null}
            format={(v) => String(Math.round(v))}
            thresholds={{ good: 90, needsImprovement: 50 }}
            lowerIsBetter={false}
          />
          <InlineMetric
            label="Best Pr."
            value={latestRun?.bestPracticesScore ?? null}
            format={(v) => String(Math.round(v))}
            thresholds={{ good: 90, needsImprovement: 50 }}
            lowerIsBetter={false}
          />
        </div>

        <Separator />

        <CardContent className="flex items-center justify-between gap-4 text-xs text-muted-foreground font-semibold tracking-tighter pt-3">
          <div className="flex items-center gap-1">
            {strategies.map((strategy) => (
              <Badge
                key={strategy}
                variant="outline"
                className="capitalize font-normal"
              >
                {strategy === "mobile" ? (
                  <Smartphone className="h-3 w-3" />
                ) : (
                  <Monitor className="h-3 w-3" />
                )}
                {strategy}
              </Badge>
            ))}
          </div>
          {latestRun?.completedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(latestRun.completedAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
