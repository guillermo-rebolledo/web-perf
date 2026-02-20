import { describe, it, expect } from "vitest";
import { parsePSIResponse } from "@/lib/psi-parser";
import { createPSIResponse } from "@/__tests__/helpers/fixtures";

describe("parsePSIResponse", () => {
  it("extracts category scores as 0-100 integers", () => {
    const result = parsePSIResponse(createPSIResponse());

    expect(result.performanceScore).toBe(85);
    expect(result.accessibilityScore).toBe(92);
    expect(result.bestPracticesScore).toBe(100);
    expect(result.seoScore).toBe(90);
  });

  it("extracts Core Web Vitals", () => {
    const result = parsePSIResponse(createPSIResponse());

    expect(result.lcp).toBe(2500);
    expect(result.fcp).toBe(1800);
    expect(result.cls).toBe(0.1);
    expect(result.ttfb).toBe(600);
    expect(result.tbt).toBe(150);
  });

  it("uses INP if available, with TBT fallback", () => {
    const result = parsePSIResponse(createPSIResponse());
    expect(result.inp).toBe(200);
  });

  it("falls back to TBT when INP is missing", () => {
    const response = createPSIResponse();
    delete response.lighthouseResult.audits["interaction-to-next-paint"];
    const result = parsePSIResponse(response);
    expect(result.inp).toBe(150);
  });

  it("extracts screenshot data", () => {
    const result = parsePSIResponse(createPSIResponse());
    expect(result.screenshot).toBe("data:image/jpeg;base64,/9j/fakescreenshot");
  });

  it("handles missing screenshot gracefully", () => {
    const response = createPSIResponse();
    delete response.lighthouseResult.audits["final-screenshot"];
    const result = parsePSIResponse(response);
    expect(result.screenshot).toBeUndefined();
  });

  it("filters audits with score < 0.9", () => {
    const result = parsePSIResponse(createPSIResponse());
    const auditIds = result.audits.map((a) => a.auditId);

    expect(auditIds).toContain("render-blocking-resources");
    expect(auditIds).toContain("largest-contentful-paint");
    expect(auditIds).toContain("first-contentful-paint");
    expect(auditIds).toContain("interaction-to-next-paint");
    expect(auditIds).toContain("total-blocking-time");
    // Allowlisted diagnostics and insight audits should NOT appear in audits
    expect(auditIds).not.toContain("unused-javascript");
    expect(auditIds).not.toContain("image-delivery-insight");
    expect(auditIds).not.toContain("render-blocking-insight");
    expect(auditIds).not.toContain("network-dependency-tree-insight");
  });

  it("marks audits as scored based on auditRefs weight", () => {
    const result = parsePSIResponse(createPSIResponse());

    // LCP has weight: 25 in the fixture auditRefs
    const lcp = result.audits.find((a) => a.auditId === "largest-contentful-paint")!;
    expect(lcp.scored).toBe(true);

    // render-blocking-resources has weight: 0 in the fixture auditRefs
    const renderBlocking = result.audits.find((a) => a.auditId === "render-blocking-resources")!;
    expect(renderBlocking.scored).toBe(false);
  });

  it("marks insights as unscored based on auditRefs weight", () => {
    const result = parsePSIResponse(createPSIResponse());

    // All insights and allowlisted diagnostics have weight: 0
    for (const insight of result.insights) {
      expect(insight.scored).toBe(false);
    }
  });

  it("sorts audits by score ascending (worst first)", () => {
    const result = parsePSIResponse(createPSIResponse());
    const scores = result.audits
      .filter((a) => a.score !== null)
      .map((a) => a.score!);

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });

  it("limits audits to 15", () => {
    const response = createPSIResponse();
    for (let i = 0; i < 20; i++) {
      response.lighthouseResult.audits[`fake-audit-${i}`] = {
        id: `fake-audit-${i}`,
        title: `Fake Audit ${i}`,
        score: 0.1,
        numericValue: i * 100,
      };
    }
    const result = parsePSIResponse(response);
    expect(result.audits.length).toBeLessThanOrEqual(15);
  });

  it("ignores string audits", () => {
    const response = createPSIResponse();
    response.lighthouseResult.audits["string-ref"] =
      "some-reference" as string;
    const result = parsePSIResponse(response);
    const auditIds = result.audits.map((a) => a.auditId);
    expect(auditIds).not.toContain("string-ref");
  });

  it("handles missing metric audits gracefully", () => {
    const response = createPSIResponse();
    delete response.lighthouseResult.audits["largest-contentful-paint"];
    delete response.lighthouseResult.audits["cumulative-layout-shift"];
    const result = parsePSIResponse(response);
    expect(result.lcp).toBeUndefined();
    expect(result.cls).toBeUndefined();
  });

  it("extracts run metadata", () => {
    const result = parsePSIResponse(createPSIResponse());

    expect(result.lighthouseVersion).toBe("12.4.0");
    expect(result.finalUrl).toBe("https://example.com/");
    expect(result.runWarnings).toEqual([]);
  });

  it("extracts extra performance metrics", () => {
    const result = parsePSIResponse(createPSIResponse());

    expect(result.speedIndex).toBe(3200);
    expect(result.tti).toBe(4100);
    expect(result.mainThreadWork).toBe(2800);
    expect(result.totalByteWeight).toBe(512000);
    expect(result.numRequests).toBe(42);
  });

  it("handles missing extra metrics gracefully", () => {
    const response = createPSIResponse();
    delete response.lighthouseResult.audits["speed-index"];
    delete response.lighthouseResult.audits["interactive"];
    delete response.lighthouseResult.audits["diagnostics"];
    delete response.lighthouseResult.audits["mainthread-work-breakdown"];
    const result = parsePSIResponse(response);

    expect(result.speedIndex).toBeUndefined();
    expect(result.tti).toBeUndefined();
    expect(result.totalByteWeight).toBeUndefined();
    expect(result.numRequests).toBeUndefined();
    expect(result.mainThreadWork).toBeUndefined();
  });

  it("extracts failing insight audits", () => {
    const result = parsePSIResponse(createPSIResponse());

    // Sorted by score ascending: network-dependency (0), unused-js (0.3), image-delivery (0.4), render-blocking (0.6)
    const ids = result.insights.map((i) => i.insightId);
    expect(ids).toContain("network-dependency-tree-insight");
    expect(ids).toContain("unused-javascript");
    expect(ids).toContain("image-delivery-insight");
    expect(ids).toContain("render-blocking-insight");

    const imageInsight = result.insights.find((i) => i.insightId === "image-delivery-insight")!;
    expect(imageInsight).toEqual({
      insightId: "image-delivery-insight",
      title: "Deliver images in modern formats",
      description: "Consider using WebP or AVIF for smaller file sizes.",
      score: 0.4,
      scored: false,
      displayValue: "Est savings of 94 KiB",
      metricSavings: { LCP: 50, FCP: 0 },
      sources: [
        { url: "https://example.com/hero.png", totalBytes: 250000, wastedBytes: 94000 },
        { url: "https://example.com/logo.png", totalBytes: 15000, wastedBytes: 8000 },
      ],
    });

    const renderInsight = result.insights.find((i) => i.insightId === "render-blocking-insight")!;
    expect(renderInsight).toMatchObject({
      score: 0.6,
      sources: [
        { url: "https://example.com/styles.css", wastedMs: 200 },
        { url: "https://example.com/app.js", wastedMs: 100 },
      ],
    });
  });

  it("sorts insights by score ascending (worst first)", () => {
    const result = parsePSIResponse(createPSIResponse());
    const scores = result.insights.map((i) => i.score ?? 1);

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });

  it("flattens network-dependency-tree chain into sources with depth", () => {
    const result = parsePSIResponse(createPSIResponse());
    const insight = result.insights.find(
      (i) => i.insightId === "network-dependency-tree-insight",
    )!;

    expect(insight.sources).toEqual([
      { url: "https://example.com/", transferSize: 7500, depth: 0 },
      { url: "https://example.com/style.css", transferSize: 6000, depth: 1 },
      { url: "https://example.com/font.woff2", transferSize: 15000, depth: 2 },
      { url: "https://example.com/app.js", transferSize: 2400, depth: 1 },
    ]);
  });

  it("promotes allowlisted diagnostic audits to insights with sources", () => {
    const result = parsePSIResponse(createPSIResponse());
    const unusedJs = result.insights.find((i) => i.insightId === "unused-javascript")!;

    expect(unusedJs).toBeDefined();
    expect(unusedJs.title).toBe("Reduce unused JavaScript");
    expect(unusedJs.score).toBe(0.3);
    expect(unusedJs.metricSavings).toEqual({ LCP: 50, FCP: 0 });
    expect(unusedJs.sources).toEqual([
      { url: "https://example.com/client.js", totalBytes: 60000, wastedBytes: 27000 },
      { url: "https://example.com/vendor.js", totalBytes: 41000, wastedBytes: 24000 },
    ]);
  });

  it("excludes allowlisted diagnostics with passing scores", () => {
    const response = createPSIResponse();
    response.lighthouseResult.audits["unused-javascript"] = {
      id: "unused-javascript",
      title: "Reduce unused JavaScript",
      description: "All good.",
      score: 1,
    };
    const result = parsePSIResponse(response);
    const ids = result.insights.map((i) => i.insightId);

    expect(ids).not.toContain("unused-javascript");
  });

  it("excludes passing insights (score === 1)", () => {
    const response = createPSIResponse();
    response.lighthouseResult.audits["image-delivery-insight"] = {
      id: "image-delivery-insight",
      title: "Deliver images in modern formats",
      description: "All good.",
      score: 1,
    };
    const result = parsePSIResponse(response);
    const ids = result.insights.map((i) => i.insightId);

    expect(ids).not.toContain("image-delivery-insight");
    expect(ids).toContain("render-blocking-insight");
  });

  it("omits sources when insight has no details.items", () => {
    const response = createPSIResponse();
    // Remove details from all insight audits
    delete (response.lighthouseResult.audits["image-delivery-insight"] as Record<string, unknown>).details;
    delete (response.lighthouseResult.audits["render-blocking-insight"] as Record<string, unknown>).details;
    delete (response.lighthouseResult.audits["network-dependency-tree-insight"] as Record<string, unknown>).details;
    delete (response.lighthouseResult.audits["unused-javascript"] as Record<string, unknown>).details;
    const result = parsePSIResponse(response);

    for (const insight of result.insights) {
      expect(insight.sources).toBeUndefined();
    }
  });

  it("filters out items without a url field from sources", () => {
    const response = createPSIResponse();
    (response.lighthouseResult.audits["image-delivery-insight"] as Record<string, unknown>).details = {
      items: [
        { url: "https://example.com/valid.png", wastedBytes: 1000 },
        { totalBytes: 500 }, // no url — should be excluded
      ],
    };
    const result = parsePSIResponse(response);
    const insight = result.insights.find((i) => i.insightId === "image-delivery-insight")!;

    expect(insight.sources).toHaveLength(1);
    expect(insight.sources![0].url).toBe("https://example.com/valid.png");
  });

  it("excludes insights with null score", () => {
    const response = createPSIResponse();
    response.lighthouseResult.audits["image-delivery-insight"] = {
      id: "image-delivery-insight",
      title: "Deliver images in modern formats",
      description: "Informational.",
      score: null,
    };
    const result = parsePSIResponse(response);
    const ids = result.insights.map((i) => i.insightId);

    expect(ids).not.toContain("image-delivery-insight");
  });

  it("defaults runWarnings to empty array when missing", () => {
    const response = createPSIResponse();
    delete response.lighthouseResult.runWarnings;
    const result = parsePSIResponse(response);

    expect(result.runWarnings).toEqual([]);
  });
});
