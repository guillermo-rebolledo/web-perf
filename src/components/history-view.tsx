/**
 * HistoryView — interactive shell for the Run History page.
 *
 * Owns the site/monitor/date-range selector state. On change, re-fetches
 * GET /api/runs?monitorId=X&days=Y&status=success&limit=100 and passes the
 * result to RunHistoryChart and RunHistoryTable.
 *
 * Latest-run ScoreCards are rendered above the chart as a quick snapshot of
 * where the monitored site stands right now.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { type Prisma, type Run } from "@prisma/client";
import { format } from "date-fns";
import { Gauge, Accessibility, ShieldCheck, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/score-card";
import { RunHistoryChart } from "@/components/run-history-chart";
import { RunHistoryTable } from "@/components/run-history-table";

type SiteWithMonitors = Prisma.SiteGetPayload<{
  include: { monitors: true };
}>;

type DayRange = 7 | 14 | 30;

interface HistoryViewProps {
  sites: SiteWithMonitors[];
  initialRuns: Run[];
  defaultSiteId: string | null;
  defaultMonitorId: string | null;
}

export function HistoryView({
  sites,
  initialRuns,
  defaultSiteId,
  defaultMonitorId,
}: HistoryViewProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    defaultSiteId ?? "",
  );
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>(
    defaultMonitorId ?? "",
  );
  const [days, setDays] = useState<DayRange>(30);
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [isLoading, setIsLoading] = useState(false);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const monitorsForSite = selectedSite?.monitors ?? [];

  const fetchRuns = useCallback(
    async (monitorId: string, daysRange: DayRange) => {
      if (!monitorId) return;
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/runs?monitorId=${monitorId}&days=${daysRange}&status=success&limit=100`,
        );
        if (!res.ok) throw new Error("Failed to fetch runs");
        const data = (await res.json()) as { runs: Run[] };
        setRuns(data.runs);
      } catch {
        setRuns([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    const site = sites.find((s) => s.id === siteId);
    const firstMonitor = site?.monitors[0];
    const monitorId = firstMonitor?.id ?? "";
    setSelectedMonitorId(monitorId);
    void fetchRuns(monitorId, days);
  };

  const handleMonitorChange = (monitorId: string) => {
    setSelectedMonitorId(monitorId);
    void fetchRuns(monitorId, days);
  };

  const handleDaysChange = (value: string) => {
    const d = parseInt(value, 10) as DayRange;
    setDays(d);
    void fetchRuns(selectedMonitorId, d);
  };

  const latestRun = runs[0] ?? null;
  const hasRuns = runs.length > 0;

  /** Arithmetic mean of a metric across all loaded runs, ignoring nulls. */
  const periodAvg = useCallback(
    (key: "performanceScore" | "accessibilityScore" | "bestPracticesScore" | "seoScore"): number | null => {
      const values = runs.map((r) => r[key]).filter((v): v is number => v !== null);
      if (values.length === 0) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    },
    [runs],
  );

  const averages = useMemo(
    () => ({
      performance: periodAvg("performanceScore"),
      accessibility: periodAvg("accessibilityScore"),
      bestPractices: periodAvg("bestPracticesScore"),
      seo: periodAvg("seoScore"),
    }),
    [periodAvg],
  );

  if (sites.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No sites found. Add a site from the Dashboard to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedSiteId} onValueChange={handleSiteChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedMonitorId}
          onValueChange={handleMonitorChange}
          disabled={monitorsForSite.length === 0}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select monitor" />
          </SelectTrigger>
          <SelectContent>
            {monitorsForSite.map((monitor) => (
              <SelectItem key={monitor.id} value={monitor.id}>
                {monitor.strategy === "mobile" ? "📱" : "🖥️"}{" "}
                <span className="capitalize">{monitor.strategy}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs
          value={String(days)}
          onValueChange={handleDaysChange}
          className="ml-auto"
        >
          <TabsList>
            <TabsTrigger value="7">7d</TabsTrigger>
            <TabsTrigger value="14">14d</TabsTrigger>
            <TabsTrigger value="30">30d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Latest-run score cards */}
      {latestRun && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">Latest run</span>
            {latestRun.completedAt && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(latestRun.completedAt), "MMM d, yyyy 'at' HH:mm")}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ScoreCard
              score={latestRun.performanceScore}
              title="Performance"
              icon={Gauge}
              average={averages.performance}
            />
            <ScoreCard
              score={latestRun.accessibilityScore}
              title="Accessibility"
              icon={Accessibility}
              average={averages.accessibility}
            />
            <ScoreCard
              score={latestRun.bestPracticesScore}
              title="Best Practices"
              icon={ShieldCheck}
              average={averages.bestPractices}
            />
            <ScoreCard
              score={latestRun.seoScore}
              title="SEO"
              icon={Search}
              average={averages.seo}
            />
          </div>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Performance Timeline{" "}
            <span className="text-muted-foreground font-normal text-sm">
              — last {days} days
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
              Loading…
            </div>
          ) : hasRuns ? (
            <RunHistoryChart runs={runs} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
              No successful runs in the last {days} days
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Run Log{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({runs.length} run{runs.length !== 1 ? "s" : ""})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              Loading…
            </div>
          ) : (
            <RunHistoryTable runs={runs} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
