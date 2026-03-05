"use client";

import { useState } from "react";
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
import { AlertStatusBadge } from "@/components/alert-status-badge";
import { AlertStatusAction } from "@/components/alert-status-action";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

interface RegressionHeaderProps {
  alertId: string;
  metricName: string;
  severity: string;
  confidence: string;
  baselineValue: number;
  actualValue: number;
  delta: number;
  percentChange: number;
  status: string;
  notes: string | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}

export function RegressionHeader({
  alertId,
  metricName,
  severity,
  confidence,
  baselineValue,
  actualValue,
  delta,
  percentChange,
  status: initialStatus,
  notes: initialNotes,
  acknowledgedAt,
  resolvedAt,
}: RegressionHeaderProps) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);

  const severityInfo = getSeverityInfo(severity);
  const confidenceInfo = getConfidenceInfo(confidence);
  const unit = getMetricUnit(metricName);

  function handleUpdate(updated: { id: string; status: string; notes: string | null }) {
    setStatus(updated.status);
    setNotes(updated.notes);
  }

  return (
    <Card>
      <CardHeader className="flex gap-2 space-y-0">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
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
          <div className="flex items-center gap-2">
            <AlertStatusBadge status={status} />
            <AlertStatusAction
              alertId={alertId}
              currentStatus={status}
              size="full"
              onUpdate={handleUpdate}
            />
          </div>
        </div>
        <CardDescription>
          Performance degradation analysis and root cause investigation
        </CardDescription>

        {/* Metadata: timestamps and notes */}
        {(acknowledgedAt || resolvedAt || notes) && (
          <div className="flex flex-col gap-2 pt-1 text-xs text-muted-foreground border-t">
            {acknowledgedAt && (
              <span>Acknowledged {format(new Date(acknowledgedAt), "PPpp")}</span>
            )}
            {resolvedAt && (
              <span>Resolved {format(new Date(resolvedAt), "PPpp")}</span>
            )}
            {notes && (
              <div className="flex items-start gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="italic">{notes}</span>
              </div>
            )}
          </div>
        )}
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
