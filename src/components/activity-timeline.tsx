"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ActivityEventCard } from "@/components/activity-event-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityEventRow, ActivityApiResponse } from "@/types/api";

const EVENT_TYPE_LABELS: Record<string, string> = {
  site_created: "Site Created",
  monitor_created: "Monitor Created",
  run_completed: "Run Completed",
  run_failed: "Run Failed",
  regression_detected: "Regression Detected",
  deployment_run_triggered: "Deployment Triggered",
};

interface ActivityTimelineProps {
  initialEvents: ActivityEventRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
}

export function ActivityTimeline({ initialEvents, initialCursor, initialHasMore }: ActivityTimelineProps) {
  const [events, setEvents] = useState<ActivityEventRow[]>(initialEvents);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchMore = useCallback(async (currentCursor: string | null, currentFilter: string, replace = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (currentCursor) params.set("cursor", currentCursor);
      if (currentFilter !== "all") params.set("type", currentFilter);
      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load activity");
      const data: ActivityApiResponse = await res.json();
      setEvents((prev) => replace ? data.events : [...prev, ...data.events]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // When type filter changes, reload from scratch
  const handleFilterChange = useCallback((value: string) => {
    setTypeFilter(value);
    setEvents([]);
    setCursor(null);
    setHasMore(false);
    void fetchMore(null, value, true);
  }, [fetchMore]);

  // Infinite scroll
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        void fetchMore(cursor, typeFilter);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, hasMore, loading, typeFilter, fetchMore]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="flex flex-col">
        {events.length === 0 && !loading ? (
          <div className="text-center text-muted-foreground py-16">
            <p className="text-sm">No activity yet.</p>
            <p className="text-xs mt-1">Events will appear here as you use the app.</p>
          </div>
        ) : (
          events.map((event) => (
            <ActivityEventCard key={event.id} event={event} />
          ))
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="flex flex-col gap-2 mt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <Skeleton className="w-3 h-3 rounded-full mt-1" />
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <Skeleton className="flex-1 h-14 mb-4 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center gap-2 py-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void fetchMore(cursor, typeFilter)}>
              Retry
            </Button>
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={observerRef} className="h-1" />
      </div>
    </div>
  );
}
