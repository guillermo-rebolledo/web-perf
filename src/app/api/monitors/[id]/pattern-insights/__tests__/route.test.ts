import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { createMonitor, createSite, createMonitorInsight } from "@/__tests__/helpers/fixtures";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 29,
    limit: 30,
    reset: new Date(),
  }),
}));

vi.mock("@/lib/posthog-server", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/feature-flags", () => ({
  FEATURE_FLAGS: {
    PATTERN_INSIGHT: "pattern_insight",
  },
}));

vi.mock("@/lib/ai/pattern-insight", () => ({
  generatePatternInsight: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/monitors/[id]/pattern-insights/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { isFeatureEnabled } from "@/lib/posthog-server";

// resolveUser mock — returns userId string or null
vi.mock("@/lib/resolve-user", () => ({
  resolveUser: vi.fn().mockResolvedValue("test-user-id"),
}));

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/monitors/[id]/pattern-insights", () => {
  beforeEach(() => {
    mockAuthenticated();
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 29,
      limit: 30,
      reset: new Date(),
    });
  });

  it("returns 403 when feature flag is disabled", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    const res = await GET(
      makeRequest("/api/monitors/m1/pattern-insights"),
      makeParams("m1")
    );
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      limit: 30,
      reset: new Date(),
    });
    prismaMock.monitor.findFirst.mockResolvedValue({
      ...createMonitor(),
      site: createSite(),
    } as never);

    const res = await GET(
      makeRequest("/api/monitors/m1/pattern-insights"),
      makeParams("m1")
    );
    expect(res.status).toBe(429);
  });

  it("returns 404 when monitor not found", async () => {
    prismaMock.monitor.findFirst.mockResolvedValue(null);
    const res = await GET(
      makeRequest("/api/monitors/m1/pattern-insights"),
      makeParams("m1")
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when monitor belongs to a different user", async () => {
    prismaMock.monitor.findFirst.mockResolvedValue({
      ...createMonitor(),
      site: createSite({ userId: "other-user-id" }),
    } as never);
    const res = await GET(
      makeRequest("/api/monitors/m1/pattern-insights"),
      makeParams("m1")
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with empty insights and isGenerating true when no insights exist", async () => {
    prismaMock.monitor.findFirst.mockResolvedValue({
      ...createMonitor(),
      site: createSite(),
    } as never);
    prismaMock.monitorInsight.findMany.mockResolvedValue([]);

    const res = await GET(
      makeRequest("/api/monitors/m1/pattern-insights"),
      makeParams("m1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.insights).toHaveLength(0);
    expect(data.isGenerating).toBe(true);
  });

  it("returns 200 with isGenerating false when fresh insight exists", async () => {
    prismaMock.monitor.findFirst.mockResolvedValue({
      ...createMonitor(),
      site: createSite(),
    } as never);
    prismaMock.monitorInsight.findMany.mockResolvedValue([
      createMonitorInsight({ generatedAt: new Date() }), // fresh — just now
    ] as never);

    const res = await GET(
      makeRequest("/api/monitors/m1/pattern-insights"),
      makeParams("m1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.insights).toHaveLength(1);
    expect(data.isGenerating).toBe(false);
  });

  it("returns 200 with isGenerating true when existing insight is stale", async () => {
    prismaMock.monitor.findFirst.mockResolvedValue({
      ...createMonitor(),
      site: createSite(),
    } as never);
    // Stale: 48 hours ago
    prismaMock.monitorInsight.findMany.mockResolvedValue([
      createMonitorInsight({
        generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      }),
    ] as never);

    const res = await GET(
      makeRequest("/api/monitors/m1/pattern-insights"),
      makeParams("m1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.insights).toHaveLength(1); // stale insight still returned
    expect(data.isGenerating).toBe(true);  // but refresh triggered
  });
});
