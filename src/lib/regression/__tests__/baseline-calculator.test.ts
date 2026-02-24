import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateBaselines } from "../baseline-calculator";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
const mockPrisma = {
  run: {
    findMany: vi.fn(),
  },
  regressionBaseline: {
    upsert: vi.fn(),
  },
} as unknown as PrismaClient;

describe("Baseline Calculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate median baseline for each metric", async () => {
    // Mock 10 successful runs
    const mockRuns = Array.from({ length: 10 }, (_, i) => ({
      lcp: 2000 + i * 100,
      tbt: 300 + i * 10,
      cls: 0.1 + i * 0.01,
      inp: 200 + i * 20,
      fcp: 1500 + i * 50,
      ttfb: 500 + i * 25,
    }));

    (mockPrisma.run.findMany as any).mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // Should create 6 baselines (one for each metric)
    expect(mockPrisma.regressionBaseline.upsert).toHaveBeenCalledTimes(6);

    // Check LCP baseline (median of 2000-2900 = 2450)
    expect(mockPrisma.regressionBaseline.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          monitorId_metricName: {
            monitorId: "monitor-123",
            metricName: "lcp",
          },
        },
        create: expect.objectContaining({
          metricName: "lcp",
          medianValue: 2450,
          sampleSize: 10,
        }),
      })
    );
  });

  it("should skip baseline calculation if less than 5 runs", async () => {
    const mockRuns = Array.from({ length: 3 }, (_, i) => ({
      lcp: 2000 + i * 100,
      tbt: null,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    }));

    (mockPrisma.run.findMany as any).mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // Should not create any baselines
    expect(mockPrisma.regressionBaseline.upsert).not.toHaveBeenCalled();
  });

  it("should handle null values correctly", async () => {
    const mockRuns = Array.from({ length: 10 }, (_, i) => ({
      lcp: i < 5 ? 2000 + i * 100 : null, // Half null
      tbt: 300 + i * 10,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    }));

    (mockPrisma.run.findMany as any).mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // LCP should be skipped (only 5 valid values)
    // TBT should be calculated (10 valid values)
    expect(mockPrisma.regressionBaseline.upsert).toHaveBeenCalledTimes(1);

    expect(mockPrisma.regressionBaseline.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          monitorId_metricName: {
            monitorId: "monitor-123",
            metricName: "tbt",
          },
        },
      })
    );
  });

  it("should calculate median correctly for even number of values", async () => {
    const mockRuns = [
      { lcp: 1000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 2000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 3000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 4000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
    ];

    (mockPrisma.run.findMany as any).mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // Median of [1000, 2000, 3000, 4000] = (2000 + 3000) / 2 = 2500
    expect(mockPrisma.regressionBaseline.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          medianValue: 2500,
        }),
      })
    );
  });

  it("should calculate median correctly for odd number of values", async () => {
    const mockRuns = [
      { lcp: 1000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 2000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 3000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 4000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 5000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
    ];

    (mockPrisma.run.findMany as any).mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // Median of [1000, 2000, 3000, 4000, 5000] = 3000
    expect(mockPrisma.regressionBaseline.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          medianValue: 3000,
        }),
      })
    );
  });
});
