import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import {
  createMonitor,
  createSite,
  createRun,
} from "@/__tests__/helpers/fixtures";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 99,
    limit: 100,
    reset: new Date(),
  }),
}));

vi.mock("@/lib/queue", () => ({
  enqueueAuditJob: vi.fn().mockResolvedValue("mock-job-id"),
}));

import { POST } from "@/app/api/monitors/[id]/run/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { enqueueAuditJob } from "@/lib/queue";

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

function makeRequest(method: string, url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"), { method });
}

describe("POST /api/monitors/[id]/run", () => {
  beforeEach(() => {
    mockAuthenticated();
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 99,
      limit: 100,
      reset: new Date(),
    });
    vi.mocked(enqueueAuditJob).mockResolvedValue("mock-job-id");
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await POST(
      makeRequest("POST", "/api/monitors/m1/run"),
      makeParams("m1")
    );
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      limit: 100,
      reset: new Date(),
    });

    prismaMock.monitor.findFirst.mockResolvedValue({
      ...createMonitor(),
      site: createSite(),
      runs: [],
    } as any);

    const res = await POST(
      makeRequest("POST", "/api/monitors/m1/run"),
      makeParams("m1")
    );
    expect(res.status).toBe(429);
  });

  it("returns 404 when monitor not found", async () => {
    prismaMock.monitor.findFirst.mockResolvedValue(null);
    const res = await POST(
      makeRequest("POST", "/api/monitors/m1/run"),
      makeParams("m1")
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when a run is already in progress", async () => {
    prismaMock.monitor.findFirst.mockResolvedValue({
      ...createMonitor(),
      site: createSite(),
      runs: [createRun({ status: "running" })],
    } as any);

    const res = await POST(
      makeRequest("POST", "/api/monitors/m1/run"),
      makeParams("m1")
    );
    expect(res.status).toBe(409);
  });

  it("creates run and enqueues job (202)", async () => {
    prismaMock.monitor.findFirst.mockResolvedValue({
      ...createMonitor(),
      site: createSite(),
      runs: [],
    } as any);
    prismaMock.run.create.mockResolvedValue(
      createRun({ id: "new-run", status: "queued" })
    );
    prismaMock.run.update.mockResolvedValue(
      createRun({ id: "new-run", jobId: "mock-job-id" })
    );

    const res = await POST(
      makeRequest("POST", "/api/monitors/m1/run"),
      makeParams("m1")
    );
    const data = await res.json();

    expect(res.status).toBe(202);
    expect(data.runId).toBe("new-run");
    expect(data.jobId).toBe("mock-job-id");
    expect(enqueueAuditJob).toHaveBeenCalled();
  });
});
