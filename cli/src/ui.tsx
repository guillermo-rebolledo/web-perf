import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { formatMs, formatCls, formatCadence, formatRelative, scoreColor, severityColor } from "./format.js";
import type {
  SiteListItem,
  MonitorSummary,
  RunSummary,
  RegressionAlert,
} from "./types/api.js";

// ---------------------------------------------------------------------------
// StaticRenderer — wraps any display component and exits ink after the first
// render, so `await waitUntilExit()` resolves cleanly.
// ---------------------------------------------------------------------------
export function StaticRenderer({ children }: { children: React.ReactNode }) {
  const { exit } = useApp();
  useEffect(() => {
    exit();
  }, [exit]);
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function HeaderRow({ columns }: { columns: { label: string; width: number }[] }) {
  return (
    <Box>
      {columns.map((col) => (
        <Box key={col.label} width={col.width}>
          <Text bold dimColor>
            {col.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function Divider({ width }: { width: number }) {
  return (
    <Box>
      <Text dimColor>{"─".repeat(width)}</Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sites list
// ---------------------------------------------------------------------------
export function SitesTable({ sites }: { sites: SiteListItem[] }) {
  const totalMonitors = sites.reduce((n, s) => n + s.monitors.length, 0);
  const siteLabel = sites.length === 1 ? "site" : "sites";
  const monLabel = totalMonitors === 1 ? "monitor" : "monitors";

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Summary + description */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        marginBottom={1}
      >
        <Text>
          {sites.length} {siteLabel} · {totalMonitors} {monLabel}
        </Text>
        <Text dimColor>
          Use a monitor id with{" "}
          <Text color="cyan">side run {"<monitorId>"}</Text> to trigger an
          audit.
        </Text>
      </Box>

      {sites.map((site, i) => (
        <Box key={site.id} flexDirection="column" marginBottom={1}>
          {i > 0 && <Divider width={60} />}
          {i > 0 && <Box marginBottom={1} />}

          {/* Site name + URL */}
          <Box gap={2}>
            <Text bold>{site.name}</Text>
            <Text dimColor>{site.url}</Text>
          </Box>

          {/* Site ID — own line, easy to copy */}
          <Box gap={2} marginLeft={2}>
            <Text dimColor>id</Text>
            <Text color="cyan">{site.id}</Text>
          </Box>

          {/* Monitors */}
          {site.monitors.length === 0 ? (
            <Box marginLeft={2}>
              <Text dimColor>no monitors — run </Text>
              <Text color="yellow">
                side monitors add --site {site.id}
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              {site.monitors.map((m) => (
                <Box key={m.id} gap={2} marginLeft={2}>
                  <Text dimColor>monitor</Text>
                  <Text color="cyan">{m.id}</Text>
                  <Text dimColor>{m.strategy}</Text>
                  <Text dimColor>{formatCadence(m.cadenceMinutes)}</Text>
                  {m.isActive ? (
                    <>
                      <Text color="green">● active</Text>
                      <Text dimColor>{formatRelative(m.nextRunAt)}</Text>
                    </>
                  ) : (
                    <Text color="gray">○ paused</Text>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
      <Box marginTop={1} />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Monitors table
// ---------------------------------------------------------------------------
export function MonitorsTable({ monitors }: { monitors: MonitorSummary[] }) {
  const COL = { id: 28, strategy: 11, cadence: 12, active: 8, next: 24 };
  const totalWidth = COL.id + COL.strategy + COL.cadence + COL.active + COL.next;

  return (
    <Box flexDirection="column" marginTop={1}>
      <HeaderRow
        columns={[
          { label: "ID", width: COL.id },
          { label: "Strategy", width: COL.strategy },
          { label: "Cadence", width: COL.cadence },
          { label: "Active", width: COL.active },
          { label: "Next run", width: COL.next },
        ]}
      />
      <Divider width={totalWidth} />
      {monitors.map((m) => (
        <Box key={m.id}>
          <Box width={COL.id}>
            <Text dimColor>{m.id}</Text>
          </Box>
          <Box width={COL.strategy}>
            <Text>{m.strategy}</Text>
          </Box>
          <Box width={COL.cadence}>
            <Text>{m.cadenceMinutes}min</Text>
          </Box>
          <Box width={COL.active}>
            <Text color={m.isActive ? "green" : "gray"}>
              {m.isActive ? "yes" : "no"}
            </Text>
          </Box>
          <Box width={COL.next}>
            <Text dimColor>{new Date(m.nextRunAt).toLocaleString()}</Text>
          </Box>
        </Box>
      ))}
      <Box marginTop={1} />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Run result output
// ---------------------------------------------------------------------------
function ScoresTable({ run }: { run: RunSummary }) {
  const rows = [
    { label: "Performance", value: run.performanceScore },
    { label: "Accessibility", value: run.accessibilityScore },
    { label: "Best Practices", value: run.bestPracticesScore },
    { label: "SEO", value: run.seoScore },
  ];

  return (
    <Box borderStyle="round" borderColor="gray" flexDirection="column" paddingX={1} alignSelf="flex-start">
      <Text bold>Lighthouse Scores</Text>
      <Divider width={24} />
      {rows.map((r) => (
        <Box key={r.label}>
          <Box width={18}>
            <Text>{r.label}</Text>
          </Box>
          <Box width={6}>
            {r.value !== null ? (
              <Text color={scoreColor(r.value)}>{Math.round(r.value)}</Text>
            ) : (
              <Text dimColor>–</Text>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function CwvTable({ run }: { run: RunSummary }) {
  const rows = [
    { metric: "LCP", value: formatMs(run.lcp) },
    { metric: "INP", value: formatMs(run.inp) },
    { metric: "CLS", value: formatCls(run.cls) },
    { metric: "FCP", value: formatMs(run.fcp) },
    { metric: "TTFB", value: formatMs(run.ttfb) },
  ];

  return (
    <Box borderStyle="round" borderColor="gray" flexDirection="column" paddingX={1} alignSelf="flex-start">
      <Text bold>Core Web Vitals</Text>
      <Divider width={21} />
      {rows.map((r) => (
        <Box key={r.metric}>
          <Box width={7}>
            <Text dimColor>{r.metric}</Text>
          </Box>
          <Box width={14}>
            <Text>{r.value}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function RegressionsSection({ alerts }: { alerts: RegressionAlert[] }) {
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const moderate = alerts.filter((a) => a.severity === "moderate").length;
  const minor = alerts.filter((a) => a.severity === "minor").length;

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text bold>{alerts.length} regression(s) detected</Text>
        {critical > 0 && <Text color="red">{critical} critical</Text>}
        {moderate > 0 && <Text color="yellow">{moderate} moderate</Text>}
        {minor > 0 && <Text dimColor>{minor} minor</Text>}
      </Box>
      {alerts.map((a) => {
        const sign = a.percentChange > 0 ? "+" : "";
        return (
          <Box key={a.id}>
            <Text>  • </Text>
            <Box width={6}>
              <Text>{a.metricName.toUpperCase()}</Text>
            </Box>
            <Text color={severityColor(a.severity)}>
              {" "}
              {sign}
              {a.percentChange.toFixed(1)}%
            </Text>
            <Text dimColor color={severityColor(a.severity)}>
              {" "}
              {a.severity}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

interface RunResultProps {
  run: RunSummary;
  alerts: RegressionAlert[];
  baseUrl: string | undefined;
  runId: string;
}

export function RunResult({ run, alerts, baseUrl, runId }: RunResultProps) {
  return (
    <Box flexDirection="column" gap={1} marginTop={1}>
      <ScoresTable run={run} />
      <CwvTable run={run} />

      {alerts.length > 0 ? (
        <RegressionsSection alerts={alerts} />
      ) : (
        <Text color="green">✓ No regressions detected</Text>
      )}

      {baseUrl && (
        <Text dimColor>
          Full results: {baseUrl.replace(/\/$/, "")}/runs/{runId}
        </Text>
      )}
      <Box />
    </Box>
  );
}
