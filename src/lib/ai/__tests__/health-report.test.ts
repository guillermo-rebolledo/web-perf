import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { createRun } from "@/__tests__/helpers/fixtures";
import { RunStatus } from "@prisma/client";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 4,
    limit: 5,
    reset: new Date(),
  }),
}));

vi.mock("@/lib/posthog-server", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/feature-flags", () => ({
  FEATURE_FLAGS: {
    HEALTH_REPORT: "health_report",
  },
}));

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "### Executive Assessment\nGreat site." }),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn().mockReturnValue(() => "mock-model"),
}));

vi.mock("@/env", () => ({
  env: { OPENAI_API_KEY: "test-key" },
}));

import { generateText } from "ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { isFeatureEnabled } from "@/lib/posthog-server";

function makeFullRun(overrides = {}) {
  return {
    ...createRun(),
    monitor: {
      id: "test-monitor-id",
      strategy: "mobile",
      site: { id: "test-site-id", name: "Test Site", url: "https://example.com", userId: "user-1" },
    },
    audits: [],
    insights: [],
    regressionAlerts: [],
    ...overrides,
  };
}

describe("generateHealthReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 4,
      limit: 5,
      reset: new Date(),
    });
  });

  it("returns early without LLM call when run already has a health report", async () => {
    prismaMock.run.findUnique.mockResolvedValue(
      makeFullRun({ healthReport: "existing report" }) as never
    );

    const { generateHealthReport } = await import("@/lib/ai/health-report");
    await generateHealthReport("run-1", "user-1");

    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns early without LLM call when run status is not success", async () => {
    prismaMock.run.findUnique.mockResolvedValue(
      makeFullRun({ status: RunStatus.failed, healthReport: null }) as never
    );

    const { generateHealthReport } = await import("@/lib/ai/health-report");
    await generateHealthReport("run-1", "user-1");

    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns early without LLM call when feature flag is disabled", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    prismaMock.run.findUnique.mockResolvedValue(
      makeFullRun({ healthReport: null }) as never
    );

    const { generateHealthReport } = await import("@/lib/ai/health-report");
    await generateHealthReport("run-1", "user-1");

    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns early without LLM call when daily limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      limit: 5,
      reset: new Date(),
    });
    prismaMock.run.findUnique.mockResolvedValue(
      makeFullRun({ healthReport: null }) as never
    );

    const { generateHealthReport } = await import("@/lib/ai/health-report");
    await generateHealthReport("run-1", "user-1");

    expect(generateText).not.toHaveBeenCalled();
  });

  it("calls LLM and updates run on success", async () => {
    prismaMock.run.findUnique.mockResolvedValue(
      makeFullRun({ healthReport: null }) as never
    );
    prismaMock.run.update.mockResolvedValue(makeFullRun() as never);

    const { generateHealthReport } = await import("@/lib/ai/health-report");
    await generateHealthReport("run-1", "user-1");

    expect(generateText).toHaveBeenCalled();
    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({
          healthReport: expect.any(String),
          healthReportAt: expect.any(Date),
          healthReportModel: "gpt-4o-mini",
        }),
      })
    );
  });

  it("checkRateLimit is called with the health-report key and userId", async () => {
    prismaMock.run.findUnique.mockResolvedValue(
      makeFullRun({ healthReport: null }) as never
    );
    prismaMock.run.update.mockResolvedValue(makeFullRun() as never);

    const { generateHealthReport } = await import("@/lib/ai/health-report");
    await generateHealthReport("run-1", "user-1");

    expect(checkRateLimit).toHaveBeenCalledWith("user-1", 5, "health-report");
  });
});
