import { describe, it, expect } from "vitest";
import { buildRunAnalysisPrompt } from "../prompt-builder";

function makeRun(overrides: Partial<Parameters<typeof buildRunAnalysisPrompt>[0]> = {}) {
  return {
    finalUrl: "https://example.com/",
    monitor: { strategy: "mobile", site: { url: "https://example.com", name: "Example Site" } },
    performanceScore: 0.85,
    accessibilityScore: 0.92,
    bestPracticesScore: 1.0,
    seoScore: 0.9,
    lcp: 2400,
    inp: 180,
    tbt: 150,
    cls: 0.05,
    fcp: 1700,
    ttfb: 700,
    regressionAlerts: [],
    insights: [],
    audits: [],
    ...overrides,
  };
}

describe("buildRunAnalysisPrompt", () => {
  describe("context header", () => {
    it("includes the site name and final URL", () => {
      const prompt = buildRunAnalysisPrompt(makeRun());
      expect(prompt).toContain("Example Site");
      expect(prompt).toContain("https://example.com/");
    });

    it("falls back to monitor site URL when finalUrl is null", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ finalUrl: null }));
      expect(prompt).toContain("https://example.com");
    });

    it("includes the strategy", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ monitor: { strategy: "desktop", site: { url: "https://example.com", name: "Example Site" } } }));
      expect(prompt).toContain("desktop");
    });
  });

  describe("performance scores", () => {
    it("labels a score >= 0.9 as Good", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ performanceScore: 0.95 }));
      expect(prompt).toMatch(/Performance:.*95.*Good/);
    });

    it("labels a score between 0.5 and 0.89 as Needs Improvement", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ performanceScore: 0.72 }));
      expect(prompt).toMatch(/Performance:.*72.*Needs Improvement/);
    });

    it("labels a score < 0.5 as Poor", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ performanceScore: 0.3 }));
      expect(prompt).toMatch(/Performance:.*30.*Poor/);
    });

    it("shows N/A for a null score", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ performanceScore: null }));
      expect(prompt).toMatch(/Performance:.*N\/A/);
    });
  });

  describe("core web vitals", () => {
    it("labels LCP <= 2500ms as Good", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ lcp: 2500 }));
      expect(prompt).toMatch(/LCP:.*2500.*Good/);
    });

    it("labels LCP between 2500ms and 4000ms as Needs Improvement", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ lcp: 3000 }));
      expect(prompt).toMatch(/LCP:.*3000.*Needs Improvement/);
    });

    it("labels LCP > 4000ms as Poor", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ lcp: 5000 }));
      expect(prompt).toMatch(/LCP:.*5000.*Poor/);
    });

    it("labels CLS <= 0.1 as Good (unit-less)", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ cls: 0.05 }));
      expect(prompt).toMatch(/CLS:.*0\.050.*Good/);
    });

    it("shows N/A for null metric values", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ lcp: null, ttfb: null }));
      expect(prompt).toMatch(/LCP:.*N\/A/);
      expect(prompt).toMatch(/TTFB:.*N\/A/);
    });
  });

  describe("regression alerts", () => {
    it("includes a regression alerts section when alerts are present", () => {
      const run = makeRun({
        regressionAlerts: [
          {
            metricName: "lcp",
            severity: "critical",
            confidence: "high",
            percentChange: 45.5,
            likelyCauses: [{ id: "c1", title: "Render-blocking scripts", confidence: 0.9 }],
          },
        ],
      });
      const prompt = buildRunAnalysisPrompt(run);
      expect(prompt).toContain("Regression Alerts");
      expect(prompt).toContain("LCP");
      expect(prompt).toContain("critical");
      expect(prompt).toContain("high confidence");
      expect(prompt).toContain("+45.5%");
      expect(prompt).toContain("Render-blocking scripts");
    });

    it("omits the regression alerts section when there are no alerts", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ regressionAlerts: [] }));
      expect(prompt).not.toContain("Regression Alerts");
    });

    it("omits the likely cause note when likelyCauses is empty", () => {
      const run = makeRun({
        regressionAlerts: [
          { metricName: "cls", severity: "minor", confidence: "low", percentChange: 12, likelyCauses: [] },
        ],
      });
      const prompt = buildRunAnalysisPrompt(run);
      expect(prompt).toContain("CLS");
      expect(prompt).not.toContain("likely cause");
    });
  });

  describe("insights", () => {
    it("includes the top insights section with titles", () => {
      const run = makeRun({
        insights: [
          {
            id: "i1",
            title: "Eliminate render-blocking resources",
            description: "Remove render-blocking stylesheets",
            score: 0,
            scored: true,
            displayValue: "1.5 s",
            metricSavings: { FCP: 500, LCP: 300 },
            sources: [{ url: "https://example.com/style.css" }],
          },
        ],
      });
      const prompt = buildRunAnalysisPrompt(run);
      expect(prompt).toContain("Improvement Opportunities");
      expect(prompt).toContain("Eliminate render-blocking resources");
      expect(prompt).toContain("800 ms total savings");
      expect(prompt).toContain("https://example.com/style.css");
    });

    it("sorts insights by total metric savings descending", () => {
      const run = makeRun({
        insights: [
          {
            id: "i1",
            title: "Low impact",
            description: "desc",
            score: 0,
            scored: true,
            displayValue: null,
            metricSavings: { FCP: 100 },
            sources: null,
          },
          {
            id: "i2",
            title: "High impact",
            description: "desc",
            score: 0,
            scored: true,
            displayValue: null,
            metricSavings: { FCP: 1500, LCP: 800 },
            sources: null,
          },
        ],
      });
      const prompt = buildRunAnalysisPrompt(run);
      const highPos = prompt.indexOf("High impact");
      const lowPos = prompt.indexOf("Low impact");
      expect(highPos).toBeLessThan(lowPos);
    });

    it("shows at most 5 insights", () => {
      const run = makeRun({
        insights: Array.from({ length: 8 }, (_, i) => ({
          id: `i${i}`,
          title: `Insight ${i}`,
          description: "desc",
          score: 0,
          scored: true,
          displayValue: null,
          metricSavings: { FCP: i * 10 },
          sources: null,
        })),
      });
      const prompt = buildRunAnalysisPrompt(run);
      const matches = prompt.match(/- \*\*Insight/g);
      expect(matches?.length).toBe(5);
    });

    it("shows at most 3 source URLs per insight", () => {
      const run = makeRun({
        insights: [
          {
            id: "i1",
            title: "Heavy resources",
            description: "desc",
            score: 0,
            scored: true,
            displayValue: null,
            metricSavings: { FCP: 500 },
            sources: [
              { url: "https://example.com/a.js" },
              { url: "https://example.com/b.js" },
              { url: "https://example.com/c.js" },
              { url: "https://example.com/d.js" },
            ],
          },
        ],
      });
      const prompt = buildRunAnalysisPrompt(run);
      expect(prompt).toContain("a.js");
      expect(prompt).toContain("b.js");
      expect(prompt).toContain("c.js");
      expect(prompt).not.toContain("d.js");
    });

    it("omits insights section when there are no insights", () => {
      const prompt = buildRunAnalysisPrompt(makeRun({ insights: [] }));
      expect(prompt).not.toContain("Improvement Opportunities");
    });
  });

  describe("failed audits", () => {
    it("includes failed audits when present", () => {
      const run = makeRun({
        audits: [
          { id: "a1", title: "Eliminate render-blocking resources", score: 0.3, scored: true, displayValue: "1.2 s" },
          { id: "a2", title: "Minify JavaScript", score: 0.5, scored: true, displayValue: "40 KiB" },
        ],
      });
      const prompt = buildRunAnalysisPrompt(run);
      expect(prompt).toContain("Failed / Warning Audits");
      expect(prompt).toContain("Eliminate render-blocking resources");
      expect(prompt).toContain("1.2 s");
    });

    it("excludes audits with score >= 0.9 (passing)", () => {
      const run = makeRun({
        audits: [
          { id: "a1", title: "Passing audit", score: 1.0, scored: true, displayValue: null },
        ],
      });
      const prompt = buildRunAnalysisPrompt(run);
      expect(prompt).not.toContain("Failed / Warning Audits");
      expect(prompt).not.toContain("Passing audit");
    });

    it("excludes unscored audits from the failed list", () => {
      const run = makeRun({
        audits: [
          { id: "a1", title: "Unscored recommendation", score: null, scored: false, displayValue: null },
        ],
      });
      const prompt = buildRunAnalysisPrompt(run);
      expect(prompt).not.toContain("Unscored recommendation");
    });

    it("shows at most 10 failed audits", () => {
      const run = makeRun({
        audits: Array.from({ length: 15 }, (_, i) => ({
          id: `a${i}`,
          title: `Failed Audit ${i}`,
          score: 0.1,
          scored: true,
          displayValue: null,
        })),
      });
      const prompt = buildRunAnalysisPrompt(run);
      const matches = prompt.match(/- Failed Audit/g);
      expect(matches?.length).toBe(10);
    });
  });

  describe("output format instructions", () => {
    it("requests the three-section markdown format", () => {
      const prompt = buildRunAnalysisPrompt(makeRun());
      expect(prompt).toContain("Executive Summary");
      expect(prompt).toContain("Priority Action Items");
      expect(prompt).toContain("Strengths");
    });
  });
});
