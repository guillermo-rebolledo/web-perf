import { describe, it, expect } from "vitest";
import {
  compareRuns,
  formatMetricValue,
  formatDelta,
} from "@/lib/metrics-compare";
import { createRun, createAudit } from "@/__tests__/helpers/fixtures";
import type { Run, Audit } from "@prisma/client";

type RunWithAudits = Run & { audits: Audit[] };

function makeRunWithAudits(
  runOverrides: Partial<Run> = {},
  audits: Partial<Audit>[] = []
): RunWithAudits {
  const run = createRun(runOverrides);
  return {
    ...run,
    audits: audits.map((a, i) =>
      createAudit({ id: `audit-${i}`, runId: run.id, ...a })
    ),
  };
}

describe("compareRuns", () => {
  it("detects score improvements (higher is better)", () => {
    const before = makeRunWithAudits({ performanceScore: 70 });
    const after = makeRunWithAudits({ performanceScore: 85 });

    const result = compareRuns(before, after);
    const perf = result.scores.find((s) => s.name === "Performance")!;

    expect(perf.delta).toBe(15);
    expect(perf.isImprovement).toBe(true);
  });

  it("detects score regressions", () => {
    const before = makeRunWithAudits({ performanceScore: 90 });
    const after = makeRunWithAudits({ performanceScore: 75 });

    const result = compareRuns(before, after);
    const perf = result.scores.find((s) => s.name === "Performance")!;

    expect(perf.delta).toBe(-15);
    expect(perf.isImprovement).toBe(false);
  });

  it("detects metric improvements (lower is better for time)", () => {
    const before = makeRunWithAudits({ lcp: 3000 });
    const after = makeRunWithAudits({ lcp: 2000 });

    const result = compareRuns(before, after);
    const lcp = result.metrics.find((m) => m.name === "LCP")!;

    expect(lcp.delta).toBe(-1000);
    expect(lcp.isImprovement).toBe(true);
  });

  it("calculates percent changes", () => {
    const before = makeRunWithAudits({ lcp: 2000 });
    const after = makeRunWithAudits({ lcp: 2500 });

    const result = compareRuns(before, after);
    const lcp = result.metrics.find((m) => m.name === "LCP")!;

    expect(lcp.percentChange).toBe(25);
  });

  it("handles null values in metrics", () => {
    const before = makeRunWithAudits({ lcp: null });
    const after = makeRunWithAudits({ lcp: 2500 });

    const result = compareRuns(before, after);
    const lcp = result.metrics.find((m) => m.name === "LCP")!;

    expect(lcp.delta).toBeNull();
    expect(lcp.percentChange).toBeNull();
  });

  it("filters out metrics where both values are null", () => {
    const before = makeRunWithAudits({ lcp: null, inp: null });
    const after = makeRunWithAudits({ lcp: null, inp: null });

    const result = compareRuns(before, after);
    const lcpMetric = result.metrics.find((m) => m.name === "LCP");
    const inpMetric = result.metrics.find((m) => m.name === "INP");

    expect(lcpMetric).toBeUndefined();
    expect(inpMetric).toBeUndefined();
  });

  it("compares audits and identifies regressions", () => {
    const before = makeRunWithAudits({}, [
      { auditId: "fcp", title: "FCP", score: 0.8 },
    ]);
    const after = makeRunWithAudits({}, [
      { auditId: "fcp", title: "FCP", score: 0.6 },
    ]);

    const result = compareRuns(before, after);
    const fcpAudit = result.audits.find((a) => a.auditId === "fcp")!;

    expect(fcpAudit.scoreDelta).toBeCloseTo(-0.2);
    expect(fcpAudit.isRegression).toBe(true);
  });

  it("sorts audit regressions first", () => {
    const before = makeRunWithAudits({}, [
      { auditId: "a", title: "A", score: 0.5 },
      { auditId: "b", title: "B", score: 0.9 },
    ]);
    const after = makeRunWithAudits({}, [
      { auditId: "a", title: "A", score: 0.7 },
      { auditId: "b", title: "B", score: 0.6 },
    ]);

    const result = compareRuns(before, after);
    expect(result.audits[0].auditId).toBe("b");
    expect(result.audits[0].isRegression).toBe(true);
  });
});

describe("formatMetricValue", () => {
  it("formats ms values", () => {
    expect(formatMetricValue(1234.5, "ms")).toBe("1235ms");
  });

  it("formats points", () => {
    expect(formatMetricValue(85.4, "points")).toBe("85");
  });

  it("formats unitless values (CLS)", () => {
    expect(formatMetricValue(0.1, "")).toBe("0.100");
  });

  it("returns N/A for null", () => {
    expect(formatMetricValue(null, "ms")).toBe("N/A");
  });
});

describe("formatDelta", () => {
  it("formats positive deltas with + sign", () => {
    expect(formatDelta(15, "ms")).toBe("+15ms");
    expect(formatDelta(5, "points")).toBe("+5");
  });

  it("formats negative deltas", () => {
    expect(formatDelta(-10, "ms")).toBe("-10ms");
  });

  it("formats zero delta", () => {
    expect(formatDelta(0, "ms")).toBe("0ms");
  });

  it("formats unitless deltas", () => {
    expect(formatDelta(0.05, "")).toBe("+0.050");
  });

  it("returns N/A for null", () => {
    expect(formatDelta(null, "ms")).toBe("N/A");
  });
});
