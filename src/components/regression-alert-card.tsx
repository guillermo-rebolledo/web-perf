import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Severity = "minor" | "moderate" | "critical";
type Confidence = "low" | "medium" | "high";

interface RegressionAlert {
  id: string;
  runId: string;
  metricName: string;
  baselineValue: number;
  actualValue: number;
  delta: number;
  percentChange: number;
  severity: Severity;
  confidence: Confidence;
  likelyCauses?: Array<{
    id: string;
    title: string;
    confidence: number;
  }> | null;
}

interface RegressionAlertCardProps {
  alert: RegressionAlert;
  showViewDetails?: boolean;
}

const severityConfig: Record<Severity, { label: string; className: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  critical: {
    label: "Critical",
    className: "border-destructive/50 bg-destructive/5",
    badgeVariant: "destructive",
  },
  moderate: {
    label: "Moderate",
    className: "border-orange-500/50 bg-orange-50 dark:bg-orange-950/20",
    badgeVariant: "default",
  },
  minor: {
    label: "Minor",
    className: "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20",
    badgeVariant: "secondary",
  },
};

const confidenceConfig: Record<Confidence, { label: string; variant: "default" | "secondary" | "outline" }> = {
  high: { label: "High Confidence", variant: "default" },
  medium: { label: "Medium Confidence", variant: "secondary" },
  low: { label: "Low Confidence", variant: "outline" },
};

export function RegressionAlertCard({ alert, showViewDetails = true }: RegressionAlertCardProps) {
  const severityInfo = severityConfig[alert.severity];
  const confidenceInfo = confidenceConfig[alert.confidence];
  const topCause = alert.likelyCauses?.[0];

  const formatMetricValue = (value: number) => {
    if (alert.metricName === "cls") return value.toFixed(3);
    return Math.round(value);
  };

  const getMetricUnit = () => {
    if (alert.metricName === "cls") return "";
    return "ms";
  };

  return (
    <Card className={cn("transition-colors", severityInfo.className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn(
              "h-5 w-5",
              alert.severity === "critical" && "text-destructive",
              alert.severity === "moderate" && "text-orange-500",
              alert.severity === "minor" && "text-yellow-600"
            )} />
            <CardTitle className="text-lg">
              {alert.metricName.toUpperCase()} Regression
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant={severityInfo.badgeVariant}>
              {severityInfo.label}
            </Badge>
            <Badge variant={confidenceInfo.variant}>
              {confidenceInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metric change */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Baseline</div>
            <div className="font-mono font-semibold">
              {formatMetricValue(alert.baselineValue)}
              <span className="text-muted-foreground ml-1">{getMetricUnit()}</span>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Current</div>
            <div className="font-mono font-semibold">
              {formatMetricValue(alert.actualValue)}
              <span className="text-muted-foreground ml-1">{getMetricUnit()}</span>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Change</div>
            <div className={cn(
              "font-mono font-semibold",
              alert.severity === "critical" && "text-destructive",
              alert.severity === "moderate" && "text-orange-600",
              alert.severity === "minor" && "text-yellow-700"
            )}>
              +{formatMetricValue(alert.delta)}
              <span className="text-muted-foreground ml-1">
                ({alert.percentChange > 0 ? '+' : ''}{alert.percentChange.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Top cause */}
        {topCause && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">
              Likely Cause:
            </div>
            <div className="text-sm font-medium">
              {topCause.title}
            </div>
          </div>
        )}

        {/* View details button */}
        {showViewDetails && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full"
            >
              <Link href={`/runs/${alert.runId}/regressions/${alert.id}`}>
                View Root Cause Analysis →
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
