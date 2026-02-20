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
    expect(auditIds).toContain("unused-javascript");
    expect(auditIds).toContain("largest-contentful-paint");
    expect(auditIds).toContain("first-contentful-paint");
    expect(auditIds).toContain("interaction-to-next-paint");
    expect(auditIds).toContain("total-blocking-time");
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

    expect(result.insights).toHaveLength(2);
    expect(result.insights[0]).toEqual({
      insightId: "image-delivery-insight",
      title: "Deliver images in modern formats",
      description: "Consider using WebP or AVIF for smaller file sizes.",
      score: 0.4,
      displayValue: "Est savings of 94 KiB",
      metricSavings: { LCP: 50, FCP: 0 },
    });
    expect(result.insights[1]).toMatchObject({
      insightId: "render-blocking-insight",
      score: 0.6,
    });
  });

  it("sorts insights by score ascending (worst first)", () => {
    const result = parsePSIResponse(createPSIResponse());
    const scores = result.insights.map((i) => i.score ?? 1);

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
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
