"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityEventCard } from "@/components/activity-event-card";
import { useActivityBadge, LS_KEY } from "@/hooks/use-activity-badge";
import type { ActivityEventRow, ActivityApiResponse } from "@/types/api";

const EVENT_TYPE_LABELS: Record<string, string> = {
  site_created: "Site Created",
  monitor_created: "Monitor Created",
  run_completed: "Run Completed",
  run_failed: "Run Failed",
  regression_detected: "Regression Detected",
  deployment_run_triggered: "Deployment Triggered",
};

interface ActivitySheetContentProps {
  typeFilter: string;
  onFilterChange: (value: string) => void;
  events: ActivityEventRow[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  cursor: string | null;
  onLoadMore: (cursor: string | null, filter: string) => void;
  onClose: () => void;
}

function ActivitySheetContent({
  typeFilter,
  onFilterChange,
  events,
  loading,
  error,
  hasMore,
  cursor,
  onLoadMore,
  onClose,
}: ActivitySheetContentProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore(cursor, typeFilter);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, hasMore, loading, typeFilter, onLoadMore]);

  return (
    <div className="flex flex-col gap-4">
      <Select value={typeFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All events" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All events</SelectItem>
          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-col">
        {events.length === 0 && !loading ? (
          <div className="text-center text-muted-foreground py-16">
            <p className="text-sm">No activity yet.</p>
            <p className="text-xs mt-1">
              Events will appear here as you use the app.
            </p>
          </div>
        ) : (
          <div onClick={onClose}>
            {events.map((event) => <ActivityEventCard key={event.id} event={event} />)}
          </div>
        )}

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

        {error && (
          <div className="flex flex-col items-center gap-2 py-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLoadMore(cursor, typeFilter)}
            >
              Retry
            </Button>
          </div>
        )}

        <div ref={observerRef} className="h-1" />
      </div>
    </div>
  );
}

export function ActivitySheet() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<ActivityEventRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const { unreadCount, setUnreadCount } = useActivityBadge(pathname);

  const fetchEvents = useCallback(
    async (currentCursor: string | null, currentFilter: string, replace = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (currentCursor) params.set("cursor", currentCursor);
        if (currentFilter !== "all") params.set("type", currentFilter);
        const res = await fetch(`/api/activity?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load activity");
        const data: ActivityApiResponse = await res.json();
        setEvents((prev) => (replace ? data.events : [...prev, ...data.events]));
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // When sheet opens, stamp localStorage, clear badge, and load fresh events
  useEffect(() => {
    if (open) {
      localStorage.setItem(LS_KEY, new Date().toISOString());
      setUnreadCount(0);
      setEvents([]);
      setCursor(null);
      setHasMore(false);
      setTypeFilter("all");
      void fetchEvents(null, "all", true);
    }
  }, [open, fetchEvents, setUnreadCount]);

  const handleFilterChange = useCallback(
    (value: string) => {
      setTypeFilter(value);
      setEvents([]);
      setCursor(null);
      setHasMore(false);
      void fetchEvents(null, value, true);
    },
    [fetchEvents],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Activity">
          <Activity className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 pr-12 flex-row items-center justify-between space-y-0">
          <SheetTitle>Activity</SheetTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/activity" onClick={() => setOpen(false)}>
              <Expand className="h-3.5 w-3.5 mr-1.5" />
              View all
            </Link>
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <ActivitySheetContent
            typeFilter={typeFilter}
            onFilterChange={handleFilterChange}
            events={events}
            loading={loading}
            error={error}
            hasMore={hasMore}
            cursor={cursor}
            onLoadMore={fetchEvents}
            onClose={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
