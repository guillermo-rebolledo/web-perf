import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";
import {
  getSeverityInfo,
  getConfidenceInfo,
  formatMetricValue,
  getMetricUnit,
} from "@/lib/alert-utils";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface RegressionAlertWithDetails {
  id: string;
  metricName: string;
  baselineValue: number;
  actualValue: number;
  delta: number;
  percentChange: number;
  severity: string;
  confidence: string;
  status: string;
  createdAt: Date;
  run: {
    id: string;
    completedAt: Date | null;
    monitor: {
      id: string;
      site: {
        id: string;
        name: string;
        url: string;
      };
    };
  };
}

interface AlertCardProps {
  alert: RegressionAlertWithDetails;
}

export function AlertCard({ alert }: AlertCardProps) {
  const severityInfo = getSeverityInfo(alert.severity);
  const confidenceInfo = getConfidenceInfo(alert.confidence);

  return (
    <Link href={`/runs/${alert.run.id}/regressions/${alert.id}`}>
      <Card
        className={cn("cursor-pointer border-0", severityInfo.borderClassName)}
      >
        <CardHeader className="pb-3 tracking-tighter">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex gap-2">
                  <span className={severityInfo.badgeClassName}>
                    {severityInfo.label} Severity
                  </span>
                  <span className={confidenceInfo.className}>
                    {confidenceInfo.label} Confidence
                  </span>
                </div>
                <CardTitle className="font-bold truncate">
                  {alert.run.monitor.site.name}
                </CardTitle>
                <CardDescription className="text-xs truncate font-geist-mono">
                  {alert.run.monitor.site.url}
                </CardDescription>
              </div>
            </div>
            {severityInfo.icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3 bg-card-muted-background border-card-muted-border divide-y divide-x-0 lg:divide-x lg:divide-y-0 divide-card-muted-border p-2 shadow-2xs">
            <div>
              <div className="text-xs text-muted-foreground">Metric</div>
              <div className="font-mono font-semibold">
                {alert.metricName.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Delta</div>
              <div className="font-mono font-semibold text-destructive">
                +{formatMetricValue(alert.delta, alert.metricName)}
                {getMetricUnit(alert.metricName)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">% Change</div>
              <div className="font-mono font-semibold text-destructive">
                +{alert.percentChange.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground tracking-tighter">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(alert.createdAt), {
                addSuffix: true,
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export type { RegressionAlertWithDetails };
