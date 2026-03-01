/**
 * RunHistoryChart — dual-tab Recharts timeline.
 *
 * "Scores" tab: plots performanceScore, accessibilityScore, bestPracticesScore,
 * and seoScore (0–100) on a single Y axis so the four categories can be
 * compared directly.
 *
 * "Core Web Vitals" tab: plots LCP, FCP, TTFB in ms (left axis) and CLS×1000
 * (right axis) so timing metrics stay readable alongside the unitless CLS.
 */

"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { format } from "date-fns";
import { type Run } from "@prisma/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RunHistoryChartProps {
  runs: Run[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipContentProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 font-semibold">{label}</p>
        {payload.map(
          (
            entry: { color?: string; name?: string; value?: number },
            index: number,
          ) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}:{" "}
              <span className="font-semibold">{entry.value?.toFixed(2)}</span>
            </p>
          ),
        )}
      </div>
    );
  }
  return null;
};

export function RunHistoryChart({ runs }: RunHistoryChartProps) {
  const [view, setView] = useState<"scores" | "cwv">("scores");

  const chartData = useMemo(() => {
    return runs
      .filter((run) => run.completedAt !== null)
      .sort(
        (a, b) =>
          new Date(a.completedAt!).getTime() -
          new Date(b.completedAt!).getTime(),
      )
      .map((run) => ({
        date: format(new Date(run.completedAt!), "MMM dd HH:mm"),
        performanceScore: run.performanceScore,
        accessibilityScore: run.accessibilityScore,
        bestPracticesScore: run.bestPracticesScore,
        seoScore: run.seoScore,
        lcp: run.lcp,
        fcp: run.fcp,
        ttfb: run.ttfb,
        cls: run.cls !== null ? run.cls * 1000 : null,
      }));
  }, [runs]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={view} onValueChange={(v) => setView(v as "scores" | "cwv")}>
        <TabsList>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="cwv">Core Web Vitals</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "scores" ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
              tickMargin={10}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={{ stroke: "var(--color-border)" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={{ stroke: "var(--color-border)" }}
              label={{
                value: "Score",
                angle: -90,
                position: "insideLeft",
                style: {
                  fontSize: 12,
                  fill: "var(--color-muted-foreground)",
                },
              }}
            />
            <Tooltip content={CustomTooltip} />
            <Legend
              wrapperStyle={{
                fontSize: 12,
                color: "var(--color-muted-foreground)",
              }}
            />
            <Line
              type="monotone"
              dataKey="performanceScore"
              stroke="var(--color-chart-1)"
              name="Performance"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-chart-1)" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="accessibilityScore"
              stroke="var(--color-chart-2)"
              name="Accessibility"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-chart-2)" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bestPracticesScore"
              stroke="var(--color-chart-3)"
              name="Best Practices"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-chart-3)" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="seoScore"
              stroke="var(--color-chart-4)"
              name="SEO"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-chart-4)" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
              tickMargin={10}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={{ stroke: "var(--color-border)" }}
            />
            <YAxis
              yAxisId="time"
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={{ stroke: "var(--color-border)" }}
              label={{
                value: "Time (ms)",
                angle: -90,
                position: "insideLeft",
                style: {
                  fontSize: 12,
                  fill: "var(--color-muted-foreground)",
                },
              }}
            />
            <YAxis
              yAxisId="cls"
              orientation="right"
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={{ stroke: "var(--color-border)" }}
              label={{
                value: "CLS ×1000",
                angle: 90,
                position: "insideRight",
                style: {
                  fontSize: 12,
                  fill: "var(--color-muted-foreground)",
                },
              }}
            />
            <Tooltip content={CustomTooltip} />
            <Legend
              wrapperStyle={{
                fontSize: 12,
                color: "var(--color-muted-foreground)",
              }}
            />
            <Line
              type="monotone"
              dataKey="lcp"
              yAxisId="time"
              stroke="var(--color-chart-1)"
              name="LCP (ms)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-chart-1)" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="fcp"
              yAxisId="time"
              stroke="var(--color-chart-2)"
              name="FCP (ms)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-chart-2)" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ttfb"
              yAxisId="time"
              stroke="var(--color-chart-3)"
              name="TTFB (ms)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-chart-3)" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="cls"
              yAxisId="cls"
              stroke="var(--color-chart-4)"
              name="CLS ×1000"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-chart-4)" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
