import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateBaselines } from "../baseline-calculator";
import { PrismaClient } from "@prisma/client";

// Mock Prisma — keep references to vi.fn() so we can call mock methods directly
const mockRunFindMany = vi.fn();
const mockBaselineUpsert = vi.fn();

const mockPrisma = {
  run: { findMany: mockRunFindMany },
  regressionBaseline: { upsert: mockBaselineUpsert },
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

    mockRunFindMany.mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // Should create 6 baselines (one for each metric)
    expect(mockBaselineUpsert).toHaveBeenCalledTimes(6);

    // Check LCP baseline (median of 2000-2900 = 2450)
    expect(mockBaselineUpsert).toHaveBeenCalledWith(
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

    mockRunFindMany.mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // Should not create any baselines
    expect(mockBaselineUpsert).not.toHaveBeenCalled();
  });

  it("should handle null values correctly", async () => {
    const mockRuns = Array.from({ length: 10 }, (_, i) => ({
      lcp: i < 5 ? 2000 + i * 100 : null, // 5 valid LCP values
      tbt: 300 + i * 10,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    }));

    mockRunFindMany.mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // LCP has 5 valid values (min), TBT has 10 — both get a baseline
    expect(mockBaselineUpsert).toHaveBeenCalledTimes(2);

    expect(mockBaselineUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          monitorId_metricName: {
            monitorId: "monitor-123",
            metricName: "tbt",
          },
        },
      })
    );
    expect(mockBaselineUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          monitorId_metricName: {
            monitorId: "monitor-123",
            metricName: "lcp",
          },
        },
      })
    );
  });

  it("should calculate median correctly for even number of values", async () => {
    // 6 runs with 6 valid LCP values → median of [1000, 2000, 2000, 3000, 4000, 4000] = (2000 + 3000) / 2 = 2500
    const mockRuns = [
      { lcp: 1000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 2000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 2000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 3000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 4000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
      { lcp: 4000, tbt: null, cls: null, inp: null, fcp: null, ttfb: null },
    ];

    mockRunFindMany.mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // Median of even count (6) = (2000 + 3000) / 2 = 2500
    expect(mockBaselineUpsert).toHaveBeenCalledWith(
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

    mockRunFindMany.mockResolvedValue(mockRuns);

    await calculateBaselines("monitor-123", mockPrisma);

    // Median of [1000, 2000, 3000, 4000, 5000] = 3000
    expect(mockBaselineUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          medianValue: 3000,
        }),
      })
    );
  });
});
