"use client";

import { useCallback, useState } from "react";
import { AlertCard, type RegressionAlertWithDetails } from "./alert-card";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { TrendingUp, AlertCircle } from "lucide-react";
import type { AlertsApiResponse } from "@/app/api/alerts/route";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ALERT_STATUSES, type AlertStatus } from "@/lib/alert-utils";

interface AlertsListProps {
  initialAlerts: RegressionAlertWithDetails[];
  days: number;
  severity?: string;
}

type StatusFilter = AlertStatus | "all";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

function deriveInitialCursor(alerts: RegressionAlertWithDetails[]): string | null {
  if (alerts.length < 20) return null;
  const last = alerts[alerts.length - 1];
  return `${last.severity}_${new Date(last.createdAt).toISOString()}_${last.id}`;
}

export function AlertsList({ initialAlerts, days, severity }: AlertsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetcher = useCallback(
    async (cursor: string | null) => {
      const params = new URLSearchParams({ days: days.toString(), limit: "20" });
      if (severity) params.set("severity", severity);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/alerts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch alerts");

      const data: AlertsApiResponse = await response.json();
      return { items: data.alerts, nextCursor: data.nextCursor, hasMore: data.hasMore };
    },
    [days, severity, statusFilter]
  );

  const { items: alerts, setItems, isLoading, hasMore, error, loadMore, observerRef } =
    useCursorPagination({
      initialItems: initialAlerts,
      initialCursor: deriveInitialCursor(initialAlerts),
      fetcher,
    });

  function handleUpdate(updated: { id: string; status: string; notes: string | null }) {
    setItems((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, status: updated.status, notes: updated.notes } : a))
    );
  }

  if (alerts.length === 0 && !isLoading) {
    return null; // Let the parent component handle empty state
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
          <TrendingUp className="h-4 w-4 text-secondary" />
          <span className="tracking-tighter">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} in the last{" "}
            {days} day{days > 1 ? "s" : ""}
          </span>
        </div>
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(v) => { if (v) setStatusFilter(v as StatusFilter); }}
          className="border rounded-md"
        >
          {(["all", ...ALERT_STATUSES] as StatusFilter[]).map((s) => (
            <ToggleGroupItem key={s} value={s} className="text-xs px-3 h-8">
              {STATUS_LABELS[s]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onUpdate={handleUpdate} />
        ))}

        {/* Loading skeletons */}
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="space-y-3">
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </div>
          ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadMore} className="ml-2 h-auto px-2 py-0.5">
            Retry
          </Button>
        </div>
      )}

      {/* Intersection observer target */}
      {hasMore && !error && <div ref={observerRef} className="h-4" />}

      {/* End of list indicator */}
      {!hasMore && alerts.length > 0 && (
        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
          <span>You&apos;ve reached the end of the list</span>
        </div>
      )}
    </div>
  );
}
