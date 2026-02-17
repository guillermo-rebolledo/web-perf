import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { createPSIResponse, createRun, createMonitor } from "@/__tests__/helpers/fixtures";
import type { Job } from "bullmq";
import type { AuditJobData } from "@/lib/queue";

vi.mock("@/lib/psi-parser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/psi-parser")>();
  return {
    ...actual,
    fetchPageSpeedInsights: vi.fn(),
  };
});

vi.mock("@/env", () => ({
  env: {
    PAGESPEED_API_KEY: "test-api-key",
  },
}));

vi.mock(import("node:fs/promises"), async (importOriginal) => {
  const actual = await importOriginal();
  const mocked = {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
  return {
    ...mocked,
    default: mocked,
  };
});

import { processAuditJob } from "@/worker/processor";
import { fetchPageSpeedInsights } from "@/lib/psi-parser";

function createMockJob(data: AuditJobData): Job<AuditJobData> {
  return {
    id: "job-1",
    data,
    progress: vi.fn(),
  } as unknown as Job<AuditJobData>;
}

describe("processAuditJob", () => {
  const jobData: AuditJobData = {
    runId: "run-1",
    monitorId: "monitor-1",
    siteUrl: "https://example.com",
    strategy: "mobile",
  };

  beforeEach(() => {
    vi.mocked(fetchPageSpeedInsights).mockResolvedValue(createPSIResponse());

    // Mock the $transaction to execute the callback with the prismaMock
    type TransactionFn = Parameters<PrismaClient["$transaction"]>[0];
    vi.mocked(prismaMock.$transaction).mockImplementation(async (fn: TransactionFn) => {
      return fn(prismaMock as Parameters<TransactionFn>[0]) as ReturnType<TransactionFn>;
    });
  });

  it("updates run status to running", async () => {
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun());
    vi.mocked(prismaMock.audit.createMany).mockResolvedValue({ count: 5 });
    vi.mocked(prismaMock.monitor.update).mockResolvedValue(createMonitor());

    await processAuditJob(createMockJob(jobData));

    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "running" }),
      })
    );
  });

  it("fetches PSI data with correct params", async () => {
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun());
    vi.mocked(prismaMock.audit.createMany).mockResolvedValue({ count: 5 });
    vi.mocked(prismaMock.monitor.update).mockResolvedValue(createMonitor());

    await processAuditJob(createMockJob(jobData));

    expect(fetchPageSpeedInsights).toHaveBeenCalledWith(
      "https://example.com",
      "mobile",
      "test-api-key"
    );
  });

  it("updates run with parsed metrics on success", async () => {
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun());
    vi.mocked(prismaMock.audit.createMany).mockResolvedValue({ count: 5 });
    vi.mocked(prismaMock.monitor.update).mockResolvedValue(createMonitor());

    await processAuditJob(createMockJob(jobData));

    // The second call to run.update (inside transaction) should have metrics
    type RunUpdateData = { status?: string; performanceScore?: number; lcp?: number };
    const runUpdateMock = vi.mocked(prismaMock.run.update);
    const transactionUpdateCall = runUpdateMock.mock.calls.find(
      (call: Parameters<typeof prismaMock.run.update>) =>
        call[0].data &&
        "performanceScore" in (call[0].data as RunUpdateData)
    );

    expect(transactionUpdateCall).toBeDefined();
    const updateData = transactionUpdateCall![0].data as RunUpdateData;
    expect(updateData.status).toBe("success");
    expect(updateData.performanceScore).toBe(85);
    expect(updateData.lcp).toBe(2500);
  });

  it("creates audit records", async () => {
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun());
    vi.mocked(prismaMock.audit.createMany).mockResolvedValue({ count: 5 });
    vi.mocked(prismaMock.monitor.update).mockResolvedValue(createMonitor());

    await processAuditJob(createMockJob(jobData));

    expect(prismaMock.audit.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ runId: "run-1" }),
        ]),
      })
    );
  });

  it("updates monitor lastRunAt", async () => {
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun());
    vi.mocked(prismaMock.audit.createMany).mockResolvedValue({ count: 5 });
    vi.mocked(prismaMock.monitor.update).mockResolvedValue(createMonitor());

    await processAuditJob(createMockJob(jobData));

    expect(prismaMock.monitor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "monitor-1" },
        data: expect.objectContaining({ lastRunAt: expect.any(Date) }),
      })
    );
  });

  it("marks run as failed and re-throws on error", async () => {
    vi.mocked(fetchPageSpeedInsights).mockRejectedValue(
      new Error("API error")
    );
    vi.mocked(prismaMock.run.update).mockResolvedValue(createRun());

    await expect(processAuditJob(createMockJob(jobData))).rejects.toThrow(
      "API error"
    );

    type RunUpdateData = { status?: string; errorMessage?: string };
    const runUpdateMock = vi.mocked(prismaMock.run.update);
    const failCall = runUpdateMock.mock.calls.find(
      (call: Parameters<typeof prismaMock.run.update>) =>
        (call[0].data as RunUpdateData)?.status === "failed"
    );
    expect(failCall).toBeDefined();
    expect((failCall![0].data as RunUpdateData).errorMessage).toBe("API error");
  });
});
