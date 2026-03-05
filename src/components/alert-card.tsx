"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";
import {
  getSeverityInfo,
  getConfidenceInfo,
  formatMetricValue,
  getMetricUnit,
} from "@/lib/alert-utils";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertStatusBadge } from "@/components/alert-status-badge";
import { AlertStatusAction } from "@/components/alert-status-action";

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
  onUpdate?: (updated: { id: string; status: string; notes: string | null }) => void;
}

export function AlertCard({ alert, onUpdate }: AlertCardProps) {
  const [status, setStatus] = useState(alert.status);
  const severityInfo = getSeverityInfo(alert.severity);
  const confidenceInfo = getConfidenceInfo(alert.confidence);
  const detailHref = `/runs/${alert.run.id}/regressions/${alert.id}`;

  function handleUpdate(updated: { id: string; status: string; notes: string | null }) {
    setStatus(updated.status);
    onUpdate?.(updated);
  }

  return (
    <Card className={cn("border-0", severityInfo.borderClassName)}>
      <CardHeader className="pb-3 tracking-tighter">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant={severityInfo.variant}>
                    {severityInfo.label} Severity
                  </Badge>
                  <Badge variant={confidenceInfo.variant}>
                    {confidenceInfo.label} Confidence
                  </Badge>
                </div>
                <AlertStatusBadge status={status} />
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
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(alert.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                {format(new Date(alert.createdAt), "PPpp")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-1">
            <AlertStatusAction
              alertId={alert.id}
              currentStatus={status}
              size="compact"
              onUpdate={handleUpdate}
            />
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs gap-1" asChild>
              <Link href={detailHref}>
                View details
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { RegressionAlertWithDetails };
