import { describe, it, expect, beforeEach, vi } from "vitest";
import { RunStatus } from "@prisma/client";
import type { Monitor, Run } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import {
  createSite,
  createMonitor,
  createRun,
} from "@/__tests__/helpers/fixtures";
import { GET, POST } from "@/app/api/monitors/route";

vi.mock("@/lib/queue", () => ({
  enqueueAuditJob: vi.fn().mockResolvedValue("mock-job-id"),
}));

function makeRequest(method: string, url: string, body?: unknown) {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  const urlObj = new URL(url, "http://localhost:3000");
  return new NextRequest(urlObj, { ...init, signal: init.signal ?? undefined });
}

describe("GET /api/monitors", () => {
  beforeEach(() => {
    mockAuthenticated();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await GET(
      makeRequest("GET", "/api/monitors?siteId=test-site-id")
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when siteId is missing", async () => {
    const res = await GET(makeRequest("GET", "/api/monitors"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when site does not belong to user", async () => {
    vi.mocked(prismaMock.site.findFirst).mockResolvedValue(null);
    const res = await GET(
      makeRequest("GET", "/api/monitors?siteId=unknown-site")
    );
    expect(res.status).toBe(404);
  });

  it("returns monitors for a valid site", async () => {
    vi.mocked(prismaMock.site.findFirst).mockResolvedValue(createSite());
    const monitors = [{ ...createMonitor(), runs: [] }];
    vi.mocked(prismaMock.monitor.findMany).mockResolvedValue(
      monitors as (Monitor & { runs: Run[] })[]
    );

    const res = await GET(
      makeRequest("GET", "/api/monitors?siteId=test-site-id")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});

describe("POST /api/monitors", () => {
  beforeEach(() => {
    mockAuthenticated();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await POST(
      makeRequest("POST", "/api/monitors", {
        siteId: "test-site-id",
      })
    );
    expect(res.status).toBe(401);
  });

  it("validates cadence range", async () => {
    const res = await POST(
      makeRequest("POST", "/api/monitors", {
        siteId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        cadenceMinutes: 5,
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when site does not belong to user", async () => {
    vi.mocked(prismaMock.site.findFirst).mockResolvedValue(null);
    const res = await POST(
      makeRequest("POST", "/api/monitors", {
        siteId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        cadenceMinutes: 60,
        strategy: "mobile",
      })
    );
    expect(res.status).toBe(404);
  });

  it("creates monitor with defaults", async () => {
    vi.mocked(prismaMock.site.findFirst).mockResolvedValue(createSite());
    vi.mocked(prismaMock.monitor.create).mockResolvedValue(createMonitor());
    vi.mocked(prismaMock.run.create).mockResolvedValue(
      createRun({ id: "new-run", status: RunStatus.queued })
    );
    vi.mocked(prismaMock.run.update).mockResolvedValue(
      createRun({ id: "new-run", jobId: "mock-job-id" })
    );

    const res = await POST(
      makeRequest("POST", "/api/monitors", {
        siteId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.monitor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strategy: "mobile",
          isActive: true,
        }),
      })
    );
  });
});
