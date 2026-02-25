import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSeverityInfo,
  getConfidenceInfo,
  formatMetricValue,
  getMetricUnit,
} from "@/lib/alert-utils";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RegressionHeaderProps {
  metricName: string;
  severity: string;
  confidence: string;
  baselineValue: number;
  actualValue: number;
  delta: number;
  percentChange: number;
}

export function RegressionHeader({
  metricName,
  severity,
  confidence,
  baselineValue,
  actualValue,
  delta,
  percentChange,
}: RegressionHeaderProps) {
  const severityInfo = getSeverityInfo(severity);
  const confidenceInfo = getConfidenceInfo(confidence);
  const unit = getMetricUnit(metricName);

  return (
    <Card>
      <CardHeader className="flex gap-2 space-y-0">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <span className="text-3xl font-extrabold tracking-tighter">
            {metricName.toUpperCase()} Regression Detected
          </span>
          <Badge variant={severityInfo.variant}>
            {severityInfo.label} Severity
          </Badge>
          <Badge variant={confidenceInfo.variant}>
            {confidenceInfo.label} Confidence
          </Badge>
        </div>
        <CardDescription>
          Performance degradation analysis and root cause investigation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:grid-cols-4">
          <RegressionStatCard
            title="Baseline"
            value={formatMetricValue(baselineValue, metricName)}
            unit={unit}
          />
          <RegressionStatCard
            title="Actual"
            value={formatMetricValue(actualValue, metricName)}
            unit={unit}
          />
          <RegressionStatCard
            title="Delta"
            value={formatMetricValue(delta, metricName)}
            unit={unit}
            valueVariant="danger"
          />
          <RegressionStatCard
            title="% Change"
            value={`${percentChange.toFixed(1)}%`}
            valueVariant="danger"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function RegressionStatCard({
  title,
  value,
  unit,
  valueVariant = "neutral",
}: {
  title: string;
  value: ReactNode;
  unit?: string;
  valueVariant?: "danger" | "neutral";
}) {
  return (
    <div className="bg-card-muted-background p-4 rounded border border-card-muted-border flex flex-col gap-2">
      <div className="text-muted-foreground uppercase font-extrabold text-xs">
        {title}
      </div>
      <div
        className={cn(
          "text-3xl font-extrabold tracking-tighter",
          valueVariant === "danger" && "text-destructive",
        )}
      >
        {value}
        {unit && <span className="text-lg font-extrabold">{unit}</span>}
      </div>
    </div>
  );
}
