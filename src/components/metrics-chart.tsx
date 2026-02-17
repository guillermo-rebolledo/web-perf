"use client";

import { useMemo } from "react";
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
import { Run } from "@prisma/client";

interface MetricsChartProps {
  runs: (Run & { monitor: { strategy: string } })[];
  metrics?: Array<"performanceScore" | "lcp" | "cls" | "fcp" | "ttfb">;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipContentProps<number, string>) => {
  if (active && payload && payload.length) {
    const strategy = (payload[0] as { payload?: { strategy?: string } })
      ?.payload?.strategy;
    const strategyIcon = strategy === "mobile" ? "📱" : "🖥️";
    const strategyLabel = strategy === "mobile" ? "Mobile" : "Desktop";

    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 font-semibold">{label}</p>
        <p className="mb-2 text-sm text-muted-foreground">
          {strategyIcon} {strategyLabel}
        </p>
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

export function MetricsChart({
  runs,
  metrics = ["performanceScore", "lcp", "cls"],
}: MetricsChartProps) {
  const chartData = useMemo(() => {
    return runs
      .filter((run) => run.status === "success" && run.completedAt)
      .sort(
        (a, b) =>
          new Date(a.completedAt!).getTime() -
          new Date(b.completedAt!).getTime(),
      )
      .map((run) => ({
        date: format(new Date(run.completedAt!), "MMM dd HH:mm"),
        timestamp: run.completedAt,
        strategy: run.monitor.strategy,
        performanceScore: run.performanceScore,
        lcp: run.lcp,
        cls: run.cls ? run.cls * 1000 : null, // Scale CLS for visibility
        fcp: run.fcp,
        ttfb: run.ttfb,
      }));
  }, [runs]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const metricConfig = {
    performanceScore: {
      color: "var(--color-chart-1)",
      name: "Performance Score",
      yAxisId: "score",
    },
    lcp: { color: "var(--color-chart-2)", name: "LCP (ms)", yAxisId: "time" },
    cls: {
      color: "var(--color-chart-3)",
      name: "CLS (×1000)",
      yAxisId: "time",
    },
    fcp: { color: "var(--color-chart-4)", name: "FCP (ms)", yAxisId: "time" },
    ttfb: { color: "var(--color-chart-5)", name: "TTFB (ms)", yAxisId: "time" },
  };

  const hasScoreMetric = metrics.includes("performanceScore");
  const hasTimeMetric = metrics.some((m) => m !== "performanceScore");

  return (
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
        {hasScoreMetric && (
          <YAxis
            yAxisId="score"
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={{ stroke: "var(--color-border)" }}
            label={{
              value: "Score",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "var(--color-muted-foreground)" },
            }}
          />
        )}
        {hasTimeMetric && (
          <YAxis
            yAxisId="time"
            orientation="right"
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={{ stroke: "var(--color-border)" }}
            label={{
              value: "Time (ms)",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12, fill: "var(--color-muted-foreground)" },
            }}
          />
        )}
        <Tooltip content={CustomTooltip} />
        <Legend
          wrapperStyle={{
            fontSize: 12,
            color: "var(--color-muted-foreground)",
          }}
        />
        {metrics.map((metric) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={metricConfig[metric].color}
            name={metricConfig[metric].name}
            yAxisId={metricConfig[metric].yAxisId}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: metricConfig[metric].color }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
