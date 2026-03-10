import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { createMonitorInsight } from "@/__tests__/helpers/fixtures";

vi.mock("@/lib/redis", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"), // "OK" = lock acquired; null = already held
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 4,
    limit: 5,
    reset: new Date(),
  }),
}));

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "### Pattern Summary\nTest.\n\n### Recurrence Analysis\nTest.\n\n### Root Cause\nTest.\n\n### Recommendation\nFix it.\n\n<!-- DOMINANT_CAUSE: js-bloat -->",
  }),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn().mockReturnValue(() => "mock-model"),
}));

vi.mock("@/env", () => ({
  env: { OPENAI_API_KEY: "test-key" },
}));

function makeAlertRow(id: string) {
  return {
    id,
    metricName: "lcp",
    severity: "moderate",
    percentChange: 25,
    createdAt: new Date("2026-01-01"),
    likelyCauses: [{ id: "js-bloat", title: "JS Bloat" }],
    run: {
      completedAt: new Date("2026-01-01T12:00:00Z"),
      monitor: { site: { name: "Test Site", url: "https://example.com" } },
    },
  };
}

import { generateText } from "ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

describe("generatePatternInsight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.set).mockResolvedValue("OK");
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 4,
      limit: 5,
      reset: new Date(),
    });
  });

  it("returns early without LLM call when fewer than 3 alerts exist", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      makeAlertRow("a1") as never,
      makeAlertRow("a2") as never,
    ]);

    const { generatePatternInsight } = await import("@/lib/ai/pattern-insight");
    await generatePatternInsight("monitor-1", "user-1");

    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns early without LLM call when generation daily limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      limit: 5,
      reset: new Date(),
    });

    prismaMock.regressionAlert.findMany.mockResolvedValue([
      makeAlertRow("a1") as never,
      makeAlertRow("a2") as never,
      makeAlertRow("a3") as never,
    ]);

    const { generatePatternInsight } = await import("@/lib/ai/pattern-insight");
    await generatePatternInsight("monitor-1", "user-1");

    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns early without LLM call when Redis lock is already held", async () => {
    vi.mocked(redis.set).mockResolvedValue(null); // null = lock NOT acquired

    prismaMock.regressionAlert.findMany.mockResolvedValue([
      makeAlertRow("a1") as never,
      makeAlertRow("a2") as never,
      makeAlertRow("a3") as never,
    ]);

    const { generatePatternInsight } = await import("@/lib/ai/pattern-insight");
    await generatePatternInsight("monitor-1", "user-1");

    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns early when existing insight is fresh with matching hash", async () => {
    const alerts = [
      makeAlertRow("a1"),
      makeAlertRow("a2"),
      makeAlertRow("a3"),
    ];
    prismaMock.regressionAlert.findMany.mockResolvedValue(alerts as never);

    // Compute the same hash the function would compute
    const crypto = await import("node:crypto");
    const sorted = [...alerts]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((a) => ({ id: a.id, metricName: a.metricName, likelyCauses: a.likelyCauses }));
    const hash = crypto.createHash("sha256").update(JSON.stringify(sorted)).digest("hex");

    prismaMock.monitorInsight.findFirst.mockResolvedValue({
      ...createMonitorInsight({ inputHash: hash }),
      generatedAt: new Date(), // fresh — just now
    } as never);

    const { generatePatternInsight } = await import("@/lib/ai/pattern-insight");
    await generatePatternInsight("monitor-1", "user-1");

    expect(generateText).not.toHaveBeenCalled();
  });

  it("calls LLM and creates insight when no existing insight exists", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      makeAlertRow("a1") as never,
      makeAlertRow("a2") as never,
      makeAlertRow("a3") as never,
    ]);
    prismaMock.monitorInsight.findFirst.mockResolvedValue(null);
    prismaMock.monitorInsight.create.mockResolvedValue(createMonitorInsight() as never);

    const { generatePatternInsight } = await import("@/lib/ai/pattern-insight");
    await generatePatternInsight("monitor-1", "user-1");

    expect(generateText).toHaveBeenCalled();
    expect(prismaMock.monitorInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          monitorId: "monitor-1",
          dominantCause: "js-bloat",
          model: "gpt-4o-mini",
          metricName: null,
        }),
      })
    );
  });

  it("Redis lock key includes monitorId", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      makeAlertRow("a1") as never,
      makeAlertRow("a2") as never,
    ]);

    const { generatePatternInsight } = await import("@/lib/ai/pattern-insight");
    await generatePatternInsight("monitor-abc", "user-1");

    expect(redis.set).toHaveBeenCalledWith(
      "lock:pattern-insight:monitor-abc",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });
});
