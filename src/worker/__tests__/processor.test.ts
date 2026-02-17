import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { createPSIResponse } from "@/__tests__/helpers/fixtures";
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
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      return fn(prismaMock);
    });
  });

  it("updates run status to running", async () => {
    prismaMock.run.update.mockResolvedValue({} as any);
    prismaMock.audit.createMany.mockResolvedValue({ count: 5 });
    prismaMock.monitor.update.mockResolvedValue({} as any);

    await processAuditJob(createMockJob(jobData));

    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "running" }),
      })
    );
  });

  it("fetches PSI data with correct params", async () => {
    prismaMock.run.update.mockResolvedValue({} as any);
    prismaMock.audit.createMany.mockResolvedValue({ count: 5 });
    prismaMock.monitor.update.mockResolvedValue({} as any);

    await processAuditJob(createMockJob(jobData));

    expect(fetchPageSpeedInsights).toHaveBeenCalledWith(
      "https://example.com",
      "mobile",
      "test-api-key"
    );
  });

  it("updates run with parsed metrics on success", async () => {
    prismaMock.run.update.mockResolvedValue({} as any);
    prismaMock.audit.createMany.mockResolvedValue({ count: 5 });
    prismaMock.monitor.update.mockResolvedValue({} as any);

    await processAuditJob(createMockJob(jobData));

    // The second call to run.update (inside transaction) should have metrics
    const transactionUpdateCall = prismaMock.run.update.mock.calls.find(
      (call) => call[0].data && "performanceScore" in (call[0].data as any)
    );

    expect(transactionUpdateCall).toBeDefined();
    const updateData = transactionUpdateCall![0].data as any;
    expect(updateData.status).toBe("success");
    expect(updateData.performanceScore).toBe(85);
    expect(updateData.lcp).toBe(2500);
  });

  it("creates audit records", async () => {
    prismaMock.run.update.mockResolvedValue({} as any);
    prismaMock.audit.createMany.mockResolvedValue({ count: 5 });
    prismaMock.monitor.update.mockResolvedValue({} as any);

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
    prismaMock.run.update.mockResolvedValue({} as any);
    prismaMock.audit.createMany.mockResolvedValue({ count: 5 });
    prismaMock.monitor.update.mockResolvedValue({} as any);

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
    prismaMock.run.update.mockResolvedValue({} as any);

    await expect(processAuditJob(createMockJob(jobData))).rejects.toThrow(
      "API error"
    );

    const failCall = prismaMock.run.update.mock.calls.find(
      (call) => (call[0].data as any)?.status === "failed"
    );
    expect(failCall).toBeDefined();
    expect((failCall![0].data as any).errorMessage).toBe("API error");
  });
});
