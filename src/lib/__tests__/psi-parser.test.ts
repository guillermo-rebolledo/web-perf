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
});
