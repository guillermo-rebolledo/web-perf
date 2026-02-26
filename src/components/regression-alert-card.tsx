import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSeverityInfo,
  getConfidenceInfo,
  getMetricUnit,
} from "@/lib/alert-utils";

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

export function RegressionAlertCard({
  alert,
  showViewDetails = true,
}: RegressionAlertCardProps) {
  const severityInfo = getSeverityInfo(alert.severity);
  const confidenceInfo = getConfidenceInfo(alert.confidence);
  const topCause = alert.likelyCauses?.[0];

  const formatMetricValue = (value: number) => {
    if (alert.metricName === "cls") return value.toFixed(3);
    return Math.round(value);
  };

  const unit = getMetricUnit(alert.metricName);

  return (
    <Card
      className={cn("border-0 transition-colors", severityInfo.borderClassName)}
    >
      <CardHeader className="pb-3 tracking-tighter">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex gap-2">
                <Badge variant={severityInfo.variant}>
                  {severityInfo.label}
                </Badge>
                <Badge variant={confidenceInfo.variant}>
                  {confidenceInfo.label} Confidence
                </Badge>
              </div>
              <CardTitle className="font-bold truncate">
                {alert.metricName.toUpperCase()} Regression
              </CardTitle>
              {topCause && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Likely Cause:{" "}
                  <span className="font-medium">{topCause.title}</span>
                </p>
              )}
            </div>
          </div>
          {severityInfo.icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3 bg-card-muted-background border-card-muted-border divide-y divide-x-0 lg:divide-x lg:divide-y-0 divide-card-muted-border p-2 shadow-2xs text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Baseline</div>
            <div className="font-mono font-semibold">
              {formatMetricValue(alert.baselineValue)}
              <span className="text-muted-foreground ml-1">{unit}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Current</div>
            <div className="font-mono font-semibold">
              {formatMetricValue(alert.actualValue)}
              <span className="text-muted-foreground ml-1">{unit}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Change</div>
            <div
              className={cn(
                "font-mono font-semibold",
                severityInfo.iconClassName,
              )}
            >
              +{formatMetricValue(alert.delta)}
              <span className="text-muted-foreground ml-1">
                ({alert.percentChange > 0 ? "+" : ""}
                {alert.percentChange.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {showViewDetails && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" asChild>
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
