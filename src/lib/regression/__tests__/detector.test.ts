import { describe, it, expect, beforeEach, vi } from "vitest";
import { detectRegressions } from "../detector";
import { PrismaClient } from "@prisma/client";

const mockPrisma = {
  regressionBaseline: {
    findMany: vi.fn(),
  },
  run: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe("Regression Detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect LCP regression when threshold exceeded", async () => {
    // Setup: baseline LCP = 2000ms
    (mockPrisma.regressionBaseline.findMany as any).mockResolvedValue([
      { metricName: "lcp", medianValue: 2000 },
    ]);

    (mockPrisma.run.findMany as any).mockResolvedValue([]);

    const run = {
      id: "run-123",
      monitor: { id: "monitor-123" },
      lcp: 2500, // +25% (+500ms) - exceeds threshold (15% and 300ms)
      tbt: null,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    } as any;

    const regressions = await detectRegressions(run, mockPrisma);

    expect(regressions).toHaveLength(1);
    expect(regressions[0]).toMatchObject({
      runId: "run-123",
      metricName: "lcp",
      baselineValue: 2000,
      actualValue: 2500,
      delta: 500,
      percentChange: 25,
      severity: "moderate",
      confidence: "low",
    });
  });

  it("should NOT detect regression when percent threshold met but absolute not met", async () => {
    // LCP needs BOTH 15% AND 300ms
    (mockPrisma.regressionBaseline.findMany as any).mockResolvedValue([
      { metricName: "lcp", medianValue: 1000 },
    ]);

    (mockPrisma.run.findMany as any).mockResolvedValue([]);

    const run = {
      id: "run-123",
      monitor: { id: "monitor-123" },
      lcp: 1200, // +20% but only +200ms (needs 300ms)
      tbt: null,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    } as any;

    const regressions = await detectRegressions(run, mockPrisma);

    expect(regressions).toHaveLength(0);
  });

  it("should classify severity correctly", async () => {
    (mockPrisma.regressionBaseline.findMany as any).mockResolvedValue([
      { metricName: "lcp", medianValue: 2000 },
    ]);

    (mockPrisma.run.findMany as any).mockResolvedValue([]);

    // Test critical (>50%)
    const criticalRun = {
      id: "run-critical",
      monitor: { id: "monitor-123" },
      lcp: 3200, // +60%
    } as any;

    const criticalRegressions = await detectRegressions(criticalRun, mockPrisma);
    expect(criticalRegressions[0].severity).toBe("critical");

    // Test moderate (20-50%)
    const moderateRun = {
      id: "run-moderate",
      monitor: { id: "monitor-123" },
      lcp: 2600, // +30%
    } as any;

    const moderateRegressions = await detectRegressions(moderateRun, mockPrisma);
    expect(moderateRegressions[0].severity).toBe("moderate");

    // Test minor (<20%)
    const minorRun = {
      id: "run-minor",
      monitor: { id: "monitor-123" },
      lcp: 2350, // +17.5%
    } as any;

    const minorRegressions = await detectRegressions(minorRun, mockPrisma);
    expect(minorRegressions[0].severity).toBe("minor");
  });

  it("should calculate confidence based on consecutive regressions", async () => {
    (mockPrisma.regressionBaseline.findMany as any).mockResolvedValue([
      { metricName: "lcp", medianValue: 2000 },
    ]);

    // Mock 2 previous runs with regressions
    (mockPrisma.run.findMany as any).mockResolvedValue([
      {
        regressionAlerts: [{ metricName: "lcp" }],
      },
      {
        regressionAlerts: [{ metricName: "lcp" }],
      },
    ]);

    const run = {
      id: "run-123",
      monitor: { id: "monitor-123" },
      lcp: 2500, // +25%
    } as any;

    const regressions = await detectRegressions(run, mockPrisma);

    // Should be high confidence (3 consecutive)
    expect(regressions[0].confidence).toBe("high");
  });

  it("should handle CLS regression with correct thresholds", async () => {
    (mockPrisma.regressionBaseline.findMany as any).mockResolvedValue([
      { metricName: "cls", medianValue: 0.1 },
    ]);

    (mockPrisma.run.findMany as any).mockResolvedValue([]);

    const run = {
      id: "run-123",
      monitor: { id: "monitor-123" },
      cls: 0.2, // +100% but only +0.1 (needs 25% AND 0.05)
    } as any;

    const regressions = await detectRegressions(run, mockPrisma);

    expect(regressions).toHaveLength(1);
    expect(regressions[0].metricName).toBe("cls");
  });

  it("should detect multiple regressions in single run", async () => {
    (mockPrisma.regressionBaseline.findMany as any).mockResolvedValue([
      { metricName: "lcp", medianValue: 2000 },
      { metricName: "tbt", medianValue: 200 },
      { metricName: "cls", medianValue: 0.05 },
    ]);

    (mockPrisma.run.findMany as any).mockResolvedValue([]);

    const run = {
      id: "run-123",
      monitor: { id: "monitor-123" },
      lcp: 2500, // Regressed
      tbt: 400, // Regressed
      cls: 0.15, // Regressed
      inp: null,
      fcp: null,
      ttfb: null,
    } as any;

    const regressions = await detectRegressions(run, mockPrisma);

    expect(regressions).toHaveLength(3);
    expect(regressions.map((r) => r.metricName)).toEqual(
      expect.arrayContaining(["lcp", "tbt", "cls"])
    );
  });
});
