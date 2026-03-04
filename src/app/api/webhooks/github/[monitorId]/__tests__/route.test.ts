import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { RunStatus } from "@prisma/client";
import type { Monitor, Run, Site } from "@prisma/client";
import { createMonitor, createSite, createRun } from "@/__tests__/helpers/fixtures";

vi.mock("@/lib/queue", () => ({
  enqueueAuditJob: vi.fn().mockResolvedValue("mock-job-id"),
}));

vi.mock("@/lib/github-webhook", () => ({
  verifyGitHubSignature: vi.fn().mockReturnValue(true),
  isSuccessfulDeployment: vi.fn().mockReturnValue(true),
}));

import { POST } from "@/app/api/webhooks/github/[monitorId]/route";
import { enqueueAuditJob } from "@/lib/queue";
import {
  verifyGitHubSignature,
  isSuccessfulDeployment,
} from "@/lib/github-webhook";

const makeParams = (monitorId: string) =>
  ({ params: Promise.resolve({ monitorId }) });

function makeRequest(body = "{}", extraHeaders: Record<string, string> = {}) {
  const headers = new Headers({
    "content-type": "application/json",
    "x-github-event": "deployment_status",
    "x-hub-signature-256": "sha256=fakesignature",
    ...extraHeaders,
  });
  return new NextRequest(
    new URL("/api/webhooks/github/test-monitor-id", "http://localhost:3000"),
    { method: "POST", headers, body }
  );
}

const enabledMonitor = {
  ...createMonitor({ id: "test-monitor-id" }),
  triggerType: "deployment",
  githubWebhookSecret: "test-secret",
  githubRepo: "owner/repo",
  githubBranch: "main",
  site: createSite(),
  runs: [] as Run[],
} as Monitor & { site: Site; runs: Run[] };

describe("POST /api/webhooks/github/[monitorId]", () => {
  beforeEach(() => {
    vi.mocked(verifyGitHubSignature).mockReturnValue(true);
    vi.mocked(isSuccessfulDeployment).mockReturnValue(true);
    vi.mocked(enqueueAuditJob).mockResolvedValue("mock-job-id");
  });

  it("returns 401 on invalid/missing signature", async () => {
    vi.mocked(prismaMock.monitor.findFirst).mockResolvedValue(enabledMonitor);
    vi.mocked(verifyGitHubSignature).mockReturnValue(false);

    const res = await POST(makeRequest(), makeParams("test-monitor-id"));
    expect(res.status).toBe(401);
  });

  it("returns 200 no-op for non-deployment_status events", async () => {
    const res = await POST(
      makeRequest("{}", { "x-github-event": "push" }),
      makeParams("test-monitor-id")
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.skipped).toBe(true);
    // Should not even look up the monitor
    expect(prismaMock.monitor.findFirst).not.toHaveBeenCalled();
  });

  it("returns 200 no-op when deployment is not a successful production deployment", async () => {
    vi.mocked(prismaMock.monitor.findFirst).mockResolvedValue(enabledMonitor);
    vi.mocked(isSuccessfulDeployment).mockReturnValue(false);

    const res = await POST(makeRequest(), makeParams("test-monitor-id"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("returns 404 when monitor not found", async () => {
    vi.mocked(prismaMock.monitor.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams("unknown-id"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when monitor has triggerType !== deployment", async () => {
    vi.mocked(prismaMock.monitor.findFirst).mockResolvedValue({
      ...enabledMonitor,
      triggerType: "schedule",
    } as Monitor & { site: Site; runs: Run[] });

    const res = await POST(makeRequest(), makeParams("test-monitor-id"));
    expect(res.status).toBe(404);
  });

  it("returns 409 when monitor already has a run in progress", async () => {
    vi.mocked(prismaMock.monitor.findFirst).mockResolvedValue({
      ...enabledMonitor,
      runs: [createRun({ status: RunStatus.running })],
    } as Monitor & { site: Site; runs: Run[] });

    const res = await POST(makeRequest(), makeParams("test-monitor-id"));
    expect(res.status).toBe(409);
  });

  it("returns 202 and enqueues audit job on valid deployment payload", async () => {
    vi.mocked(prismaMock.monitor.findFirst).mockResolvedValue(enabledMonitor);
    vi.mocked(prismaMock.run.create).mockResolvedValue(
      createRun({ id: "new-run", status: RunStatus.queued })
    );
    vi.mocked(prismaMock.run.update).mockResolvedValue(
      createRun({ id: "new-run", jobId: "mock-job-id" })
    );

    const res = await POST(makeRequest(), makeParams("test-monitor-id"));
    const data = await res.json();

    expect(res.status).toBe(202);
    expect(data.runId).toBe("new-run");
    expect(data.jobId).toBe("mock-job-id");
    expect(enqueueAuditJob).toHaveBeenCalledWith(
      expect.objectContaining({ monitorId: "test-monitor-id" })
    );
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(prismaMock.monitor.findFirst).mockRejectedValue(
      new Error("DB connection failed")
    );

    const res = await POST(makeRequest(), makeParams("test-monitor-id"));
    expect(res.status).toBe(500);
  });
});
