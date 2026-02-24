import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSeverityInfo, getConfidenceInfo, getMetricUnit } from "@/lib/alert-utils";

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

export function RegressionAlertCard({ alert, showViewDetails = true }: RegressionAlertCardProps) {
  const severityInfo = getSeverityInfo(alert.severity);
  const confidenceInfo = getConfidenceInfo(alert.confidence);
  const topCause = alert.likelyCauses?.[0];

  const formatMetricValue = (value: number) => {
    if (alert.metricName === "cls") return value.toFixed(3);
    return Math.round(value);
  };

  const unit = getMetricUnit(alert.metricName);

  return (
    <Card className={cn("transition-colors", severityInfo.cardClassName)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("h-5 w-5", severityInfo.iconClassName)} />
            <CardTitle className="text-lg">
              {alert.metricName.toUpperCase()} Regression
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant={severityInfo.variant}>
              {severityInfo.label}
            </Badge>
            <Badge variant={confidenceInfo.variant}>
              {confidenceInfo.label} Confidence
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
              <span className="text-muted-foreground ml-1">{unit}</span>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Current</div>
            <div className="font-mono font-semibold">
              {formatMetricValue(alert.actualValue)}
              <span className="text-muted-foreground ml-1">{unit}</span>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Change</div>
            <div className={cn("font-mono font-semibold", severityInfo.iconClassName)}>
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
