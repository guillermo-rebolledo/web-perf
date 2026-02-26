import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { createRun, createMonitor, createSite } from "@/__tests__/helpers/fixtures";
import { RunStatus } from "@prisma/client";
import type { Monitor, Site } from "@prisma/client";

// --- Mock external dependencies before importing the route ---

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 4,
    limit: 5,
    reset: new Date(),
  }),
}));

vi.mock("@/lib/ai/prompt-builder", () => ({
  buildRunAnalysisPrompt: vi.fn().mockReturnValue("mock prompt"),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn()),
}));

let capturedOnFinish: ((result: { text: string }) => Promise<void>) | undefined;

vi.mock("ai", () => ({
  streamText: vi.fn((options: { onFinish?: (r: { text: string }) => Promise<void> }) => {
    capturedOnFinish = options.onFinish;
    return {
      toTextStreamResponse: () => new Response("streamed summary", { status: 200 }),
    };
  }),
}));

import { POST } from "@/app/api/runs/[id]/ai-summary/route";
import { checkRateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

function makeRequest() {
  return new NextRequest(new URL("/api/runs/r1/ai-summary", "http://localhost:3000"), {
    method: "POST",
  });
}

/** Build a run fixture that includes the relations the route expects */
function createRunWithIncludes(
  overrides: Partial<ReturnType<typeof createRun>> & {
    monitorOverrides?: Partial<Monitor>;
    siteOverrides?: Partial<Site>;
  } = {}
) {
  const { monitorOverrides, siteOverrides, ...runOverrides } = overrides;
  return {
    ...createRun({ status: RunStatus.success, ...runOverrides }),
    monitor: {
      ...createMonitor(monitorOverrides),
      site: createSite(siteOverrides),
    },
    regressionAlerts: [],
    insights: [],
    audits: [],
  };
}

// ---------------------------------------------------------------------------

describe("POST /api/runs/[id]/ai-summary", () => {
  beforeEach(() => {
    mockAuthenticated();
    capturedOnFinish = undefined;
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 4,
      limit: 5,
      reset: new Date(),
    });
  });

  // --- Auth & ownership ---

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await POST(makeRequest(), makeParams("r1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when run is not found", async () => {
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams("r1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the run belongs to a different user", async () => {
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(
      createRunWithIncludes({ siteOverrides: { userId: "other-user" } }) as never
    );
    const res = await POST(makeRequest(), makeParams("r1"));
    expect(res.status).toBe(404);
  });

  // --- Status guard ---

  it("returns 422 when the run did not succeed", async () => {
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(
      createRunWithIncludes({ status: RunStatus.failed }) as never
    );
    const res = await POST(makeRequest(), makeParams("r1"));
    expect(res.status).toBe(422);
  });

  // --- Rate limiting: per-run cooldown ---

  it("returns 429 with cooldown error when aiSummaryAt is within the last hour", async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(
      createRunWithIncludes({ aiSummaryAt: thirtyMinutesAgo }) as never
    );

    const res = await POST(makeRequest(), makeParams("r1"));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("cooldown");
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("allows generation when aiSummaryAt is more than an hour ago", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(
      createRunWithIncludes({ aiSummaryAt: twoHoursAgo }) as never
    );
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun() as never);

    const res = await POST(makeRequest(), makeParams("r1"));
    expect(res.status).toBe(200);
  });

  // --- Rate limiting: daily cap ---

  it("returns 429 with daily_limit error when the per-user daily cap is exceeded", async () => {
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(
      createRunWithIncludes() as never
    );
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      limit: 5,
      reset: new Date(),
    });

    const res = await POST(makeRequest(), makeParams("r1"));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("daily_limit");
  });

  it("calls checkRateLimit with the ai-summary key prefix", async () => {
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(
      createRunWithIncludes() as never
    );
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun() as never);

    await POST(makeRequest(), makeParams("r1"));

    expect(checkRateLimit).toHaveBeenCalledWith(
      "test-user-id",
      5,
      "ai-summary"
    );
  });

  // --- Success path ---

  it("returns 200 with a streamed text response", async () => {
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(
      createRunWithIncludes() as never
    );
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun() as never);

    const res = await POST(makeRequest(), makeParams("r1"));
    expect(res.status).toBe(200);
  });

  it("saves the summary to the DB when streaming finishes", async () => {
    vi.mocked(prismaMock.run.findFirst).mockResolvedValue(
      createRunWithIncludes({ id: "r1" }) as never
    );
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun() as never);

    await POST(makeRequest(), makeParams("r1"));

    // Simulate the AI SDK calling onFinish after streaming completes
    await capturedOnFinish?.({ text: "This is the generated summary." });

    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r1" },
        data: expect.objectContaining({
          aiSummary: "This is the generated summary.",
          aiSummaryModel: "gpt-4o-mini",
        }),
      })
    );
    // aiSummaryAt should be a Date
    const callArgs = vi.mocked(prismaMock.run.update).mock.calls[0][0];
    expect(callArgs.data.aiSummaryAt).toBeInstanceOf(Date);
  });
});
