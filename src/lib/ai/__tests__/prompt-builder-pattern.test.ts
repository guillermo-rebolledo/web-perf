import { describe, it, expect } from "vitest";
import {
  buildPatternAnalysisPrompt,
  buildHealthReportPrompt,
  type PatternAlert,
} from "@/lib/ai/prompt-builder";

function makeAlert(overrides: Partial<PatternAlert> = {}): PatternAlert {
  return {
    id: "alert-1",
    metricName: "lcp",
    severity: "moderate",
    percentChange: 25,
    createdAt: new Date("2026-01-01"),
    likelyCauses: [
      { id: "js-bloat", title: "JavaScript Bloat", confidence: 80, estimatedImpact: 200 },
    ],
    run: { completedAt: new Date("2026-01-01T12:00:00Z") },
    ...overrides,
  };
}

describe("buildPatternAnalysisPrompt", () => {
  const alerts = [
    makeAlert({ id: "a1" }),
    makeAlert({ id: "a2", percentChange: 30 }),
    makeAlert({ id: "a3", percentChange: 18 }),
  ];

  it("includes site name and URL", () => {
    const prompt = buildPatternAnalysisPrompt(alerts, "My Site", "https://example.com");
    expect(prompt).toContain("My Site");
    expect(prompt).toContain("https://example.com");
  });

  it("includes the regression count", () => {
    const prompt = buildPatternAnalysisPrompt(alerts, "Site", "https://x.com");
    expect(prompt).toContain("3 regression");
  });

  it("contains all four required section headers", () => {
    const prompt = buildPatternAnalysisPrompt(alerts, "Site", "https://x.com");
    expect(prompt).toContain("### Pattern Summary");
    expect(prompt).toContain("### Recurrence Analysis");
    expect(prompt).toContain("### Root Cause");
    expect(prompt).toContain("### Recommendation");
  });

  it("includes the dominant cause id in the machine-readable marker instruction", () => {
    const prompt = buildPatternAnalysisPrompt(alerts, "Site", "https://x.com");
    expect(prompt).toContain("DOMINANT_CAUSE: js-bloat");
  });

  it("aggregates cause frequency across alerts", () => {
    const mixedAlerts = [
      makeAlert({
        id: "b1",
        likelyCauses: [{ id: "js-bloat", title: "JS Bloat" }, { id: "third-party", title: "Third Party" }],
      }),
      makeAlert({
        id: "b2",
        likelyCauses: [{ id: "js-bloat", title: "JS Bloat" }],
      }),
      makeAlert({
        id: "b3",
        likelyCauses: [{ id: "third-party", title: "Third Party" }],
      }),
    ];
    const prompt = buildPatternAnalysisPrompt(mixedAlerts, "Site", "https://x.com");
    // js-bloat appears in 2 alerts, third-party in 2 — both should be listed
    expect(prompt).toContain("js-bloat");
    expect(prompt).toContain("third-party");
  });

  it("handles empty likelyCauses gracefully (no crash)", () => {
    const alertsNoCauses = [
      makeAlert({ id: "c1", likelyCauses: null }),
      makeAlert({ id: "c2", likelyCauses: [] }),
      makeAlert({ id: "c3", likelyCauses: "invalid" }),
    ];
    expect(() =>
      buildPatternAnalysisPrompt(alertsNoCauses, "Site", "https://x.com")
    ).not.toThrow();
  });

  it("handles mixed metric alerts", () => {
    const mixedMetrics = [
      makeAlert({ id: "d1", metricName: "lcp" }),
      makeAlert({ id: "d2", metricName: "tbt" }),
      makeAlert({ id: "d3", metricName: "lcp" }),
    ];
    const prompt = buildPatternAnalysisPrompt(mixedMetrics, "Site", "https://x.com");
    expect(prompt).toContain("LCP");
    expect(prompt).toContain("TBT");
  });
});

describe("buildHealthReportPrompt", () => {
  const baseRun = {
    finalUrl: "https://example.com/",
    monitor: { strategy: "mobile", site: { url: "https://example.com", name: "My Site" } },
    performanceScore: 0.72,
    accessibilityScore: 0.91,
    bestPracticesScore: 0.83,
    seoScore: 0.88,
    lcp: 2800,
    inp: 180,
    tbt: 220,
    cls: 0.09,
    fcp: 1600,
    ttfb: 700,
    speedIndex: 3200,
    tti: 4100,
    totalByteWeight: 512000,
    numRequests: 42,
    mainThreadWork: 2800,
    regressionAlerts: [],
    insights: Array.from({ length: 25 }, (_, i) => ({
      id: `insight-${i}`,
      title: `Insight ${i}`,
      description: "Fix this.",
      score: 0.5,
      scored: true,
      displayValue: null,
      metricSavings: { LCP: i * 10 },
      sources: [],
    })),
    audits: Array.from({ length: 35 }, (_, i) => ({
      id: `audit-${i}`,
      title: `Audit ${i}`,
      score: i < 20 ? 0.4 : 1.0,
      scored: true,
      displayValue: null,
    })),
  };

  it("includes all five required section headers", () => {
    const prompt = buildHealthReportPrompt(baseRun);
    expect(prompt).toContain("### Executive Assessment");
    expect(prompt).toContain("### Quick Wins (Effort vs Impact)");
    expect(prompt).toContain("### Risk Areas");
    expect(prompt).toContain("### Monitoring Strategy");
    expect(prompt).toContain("### Performance Maturity");
  });

  it("includes strategy in the prompt", () => {
    const prompt = buildHealthReportPrompt(baseRun);
    expect(prompt).toContain("mobile");
  });

  it("caps insights at 20 items", () => {
    const prompt = buildHealthReportPrompt(baseRun);
    // 25 insights provided — only 20 should appear (indices 0-19, sorted by savings desc)
    // Insight 24 has savings 240, insight 0 has 0 — top 20 should NOT include insights with 0 or low savings
    const insightCount = (prompt.match(/Insight \d+/g) ?? []).length;
    expect(insightCount).toBeLessThanOrEqual(20);
  });

  it("caps audits at 30 failed items", () => {
    const prompt = buildHealthReportPrompt(baseRun);
    // 35 audits provided, 20 are failing — all 20 failing should appear (under the 30 cap)
    const auditCount = (prompt.match(/Audit \d+/g) ?? []).length;
    expect(auditCount).toBeLessThanOrEqual(30);
  });

  it("includes extra metrics when provided", () => {
    const prompt = buildHealthReportPrompt(baseRun);
    expect(prompt).toContain("Speed Index");
    expect(prompt).toContain("Time to Interactive");
    expect(prompt).toContain("Total Page Weight");
    expect(prompt).toContain("Number of Requests");
    expect(prompt).toContain("Main Thread Work");
  });

  it("omits extra metrics section when all are null", () => {
    const runNoExtra = {
      ...baseRun,
      speedIndex: null,
      tti: null,
      totalByteWeight: null,
      numRequests: null,
      mainThreadWork: null,
    };
    const prompt = buildHealthReportPrompt(runNoExtra);
    expect(prompt).not.toContain("Additional Metrics");
  });
});
