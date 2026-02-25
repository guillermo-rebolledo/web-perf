"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCard, type RegressionAlertWithDetails } from "./alert-card";
import { Skeleton } from "./ui/skeleton";
import { TrendingUp, AlertCircle } from "lucide-react";
import type { AlertsApiResponse } from "@/app/api/alerts/route";

interface AlertsListProps {
  initialAlerts: RegressionAlertWithDetails[];
  days: number;
  severity?: string;
}

export function AlertsList({ initialAlerts, days, severity }: AlertsListProps) {
  const [alerts, setAlerts] = useState<RegressionAlertWithDetails[]>(initialAlerts);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchMoreAlerts = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        limit: "20",
      });

      if (severity) {
        params.set("severity", severity);
      }

      if (nextCursor) {
        params.set("cursor", nextCursor);
      }

      const response = await fetch(`/api/alerts?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }

      const data: AlertsApiResponse = await response.json();

      setAlerts((prev) => [...prev, ...data.alerts]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more alerts");
      console.error("Error fetching more alerts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, nextCursor, days, severity]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const currentTarget = observerTarget.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchMoreAlerts();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px", // Start loading 100px before reaching the bottom
      }
    );

    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchMoreAlerts, hasMore, isLoading]);

  // Reset alerts when filters change
  useEffect(() => {
    setAlerts(initialAlerts);
    setNextCursor(null);
    setHasMore(initialAlerts.length >= 20);
  }, [initialAlerts, days, severity]);

  if (alerts.length === 0 && !isLoading) {
    return null; // Let the parent component handle empty state
  }

  return (
    <div className="flex flex-col gap-4">
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
          <TrendingUp className="h-4 w-4" />
          <span className="tracking-tighter">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} in the last{" "}
            {days} day{days > 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
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
          <button
            onClick={fetchMoreAlerts}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Intersection observer target */}
      {hasMore && !error && <div ref={observerTarget} className="h-4" />}

      {/* End of list indicator */}
      {!hasMore && alerts.length > 0 && (
        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
          <span>You&apos;ve reached the end of the list</span>
        </div>
      )}
    </div>
  );
}
