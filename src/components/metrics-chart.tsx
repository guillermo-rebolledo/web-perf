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
  TooltipProps,
} from "recharts";
import { format } from "date-fns";
import { Run } from "@prisma/client";

interface MetricsChartProps {
  runs: (Run & { monitor: { strategy: string } })[];
  metrics?: Array<"performanceScore" | "lcp" | "cls" | "fcp" | "ttfb">;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const strategy = payload[0]?.payload?.strategy;
    const strategyIcon = strategy === "mobile" ? "📱" : "🖥️";
    const strategyLabel = strategy === "mobile" ? "Mobile" : "Desktop";

    return (
      <div className="rounded-lg border bg-white p-3 shadow-lg">
        <p className="mb-2 font-semibold">{label}</p>
        <p className="mb-2 text-sm text-gray-600">
          {strategyIcon} {strategyLabel}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value?.toFixed(2)}</span>
          </p>
        ))}
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
          new Date(b.completedAt!).getTime()
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
      color: "#10b981",
      name: "Performance Score",
      yAxisId: "score",
    },
    lcp: { color: "#3b82f6", name: "LCP (ms)", yAxisId: "time" },
    cls: { color: "#f59e0b", name: "CLS (×1000)", yAxisId: "time" },
    fcp: { color: "#8b5cf6", name: "FCP (ms)", yAxisId: "time" },
    ttfb: { color: "#ec4899", name: "TTFB (ms)", yAxisId: "time" },
  };

  const hasScoreMetric = metrics.includes("performanceScore");
  const hasTimeMetric = metrics.some((m) => m !== "performanceScore");

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickMargin={10}
        />
        {hasScoreMetric && (
          <YAxis
            yAxisId="score"
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            label={{
              value: "Score",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
        )}
        {hasTimeMetric && (
          <YAxis
            yAxisId="time"
            orientation="right"
            tick={{ fontSize: 12 }}
            label={{
              value: "Time (ms)",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12 },
            }}
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {metrics.map((metric) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={metricConfig[metric].color}
            name={metricConfig[metric].name}
            yAxisId={metricConfig[metric].yAxisId}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
