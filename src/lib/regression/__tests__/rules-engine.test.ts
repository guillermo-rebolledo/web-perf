import { describe, it, expect, beforeEach, vi } from "vitest";
import { analyzeRootCauses } from "../rules-engine";
import { PrismaClient, Run } from "@prisma/client";

// Mock Prisma — keep references to vi.fn() so we can call mock methods directly
const mockRunFindFirst = vi.fn();
const mockInsightFindMany = vi.fn();

const mockPrisma = {
  run: { findFirst: mockRunFindFirst },
  insight: { findMany: mockInsightFindMany },
} as unknown as PrismaClient;

describe("Rules Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should analyze root causes and rank by confidence × impact × evidence", async () => {
    // Mock baseline run (include insights for calculateDiffSummary)
    mockRunFindFirst.mockResolvedValue({
      id: "baseline-run",
      lcp: 2000,
      totalByteWeight: 1000000,
      completedAt: new Date("2024-01-01"),
      insights: [],
    });

    // Mock insights (mainthread-work-breakdown gives scriptingTimeDelta so js-bloat rule fires)
    mockInsightFindMany.mockImplementation(({ where }: { where: { runId: string } }) => {
      if (where.runId === "current-run") {
        return Promise.resolve([
          {
            insightId: "bootup-time",
            score: 0.5,
            sources: [
              { url: "https://example.com/app.js", wastedMs: 500 },
            ],
          },
          {
            insightId: "third-party-summary",
            score: 0.6,
            sources: [
              { url: "https://analytics.example.com", blockingTime: 300 },
            ],
          },
          {
            insightId: "mainthread-work-breakdown",
            score: 0.5,
            sources: [
              { group: "scriptEvaluation", duration: 200 },
              { group: "styleLayout", duration: 50 },
            ],
          },
        ]);
      }
      return Promise.resolve([
        {
          insightId: "bootup-time",
          score: 0.9,
          sources: [],
        },
      ]);
    });

    const currentRun = {
      id: "current-run",
      monitorId: "monitor-123",
      lcp: 2600,
      totalByteWeight: 1200000,
      completedAt: new Date("2024-01-02"),
    } as unknown as Run;

    const causes = await analyzeRootCauses("lcp", currentRun, mockPrisma);

    // Should return ranked causes (top 5)
    expect(causes.length).toBeGreaterThan(0);
    expect(causes.length).toBeLessThanOrEqual(5);

    // Each cause should have required fields
    causes.forEach((cause) => {
      expect(cause).toHaveProperty("id");
      expect(cause).toHaveProperty("title");
      expect(cause).toHaveProperty("description");
      expect(cause).toHaveProperty("confidence");
      expect(cause).toHaveProperty("estimatedImpact");
      expect(cause).toHaveProperty("evidence");
      expect(cause).toHaveProperty("recommendations");
    });
  });

  it("should only apply rules for the regressed metric", async () => {
    mockRunFindFirst.mockResolvedValue({
      id: "baseline-run",
      cls: 0.05,
      completedAt: new Date("2024-01-01"),
      insights: [],
    });

    mockInsightFindMany.mockResolvedValue([
      {
        insightId: "layout-shift-elements",
        score: 0.8,
        sources: [{ node: '{"selector": "div.banner"}', score: 0.1 }],
      },
    ]);

    const currentRun = {
      id: "current-run",
      monitorId: "monitor-123",
      cls: 0.15,
      completedAt: new Date("2024-01-02"),
    } as unknown as Run;

    const causes = await analyzeRootCauses("cls", currentRun, mockPrisma);

    // Should only include CLS-related causes
    const hasCLSCause = causes.some((c) => c.id === "cls");
    const hasJSBloatCause = causes.some((c) => c.id === "js-bloat");

    expect(hasCLSCause).toBe(true);
    expect(hasJSBloatCause).toBe(false); // JS bloat applies to lcp/tbt/inp, not cls
  });

  it("should handle missing baseline gracefully", async () => {
    mockRunFindFirst.mockResolvedValue(null);
    mockInsightFindMany.mockResolvedValue([]);

    const currentRun = {
      id: "current-run",
      monitorId: "monitor-123",
      lcp: 2600,
      completedAt: new Date("2024-01-02"),
    } as unknown as Run;

    const causes = await analyzeRootCauses("lcp", currentRun, mockPrisma);

    // Should still return some causes (rules can work without baseline)
    // But they may have limited evidence
    expect(Array.isArray(causes)).toBe(true);
  });

  it("should limit results to top 5 causes", async () => {
    mockRunFindFirst.mockResolvedValue({
      id: "baseline-run",
      lcp: 2000,
      completedAt: new Date("2024-01-01"),
      insights: [],
    });

    mockInsightFindMany.mockResolvedValue([
      // Provide insights that trigger multiple rules
      { insightId: "bootup-time", score: 0.5, sources: [] },
      { insightId: "third-party-summary", score: 0.5, sources: [] },
      { insightId: "network-requests", score: 0.5, sources: [] },
      { insightId: "largest-contentful-paint-element", score: 0.5, sources: [] },
    ]);

    const currentRun = {
      id: "current-run",
      monitorId: "monitor-123",
      lcp: 3000, // Significant regression
      completedAt: new Date("2024-01-02"),
    } as unknown as Run;

    const causes = await analyzeRootCauses("lcp", currentRun, mockPrisma);

    expect(causes.length).toBeLessThanOrEqual(5);
  });
});
