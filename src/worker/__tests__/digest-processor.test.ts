import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__tests__/helpers/prisma-mock";
import { prismaMock } from "../../__tests__/helpers/prisma-mock";
import type { UserDigestData } from "@/lib/digest/aggregator";
import { subDays } from "date-fns";

vi.mock("@/lib/digest/aggregator", () => ({
  aggregateUserDigest: vi.fn(),
}));

vi.mock("@/lib/digest/sender", () => ({
  sendDigestEmail: vi.fn(),
}));

import { processDigestJob } from "../digest-processor";
import { aggregateUserDigest } from "@/lib/digest/aggregator";
import { sendDigestEmail } from "@/lib/digest/sender";

const makeDigestData = (email: string): UserDigestData => ({
  user: { id: `user-${email}`, email, name: null },
  weekRange: { start: subDays(new Date(), 7), end: new Date() },
  sites: [
    {
      site: { id: "s1", name: "Site", url: "https://example.com" },
      monitorId: "m1",
      strategy: "mobile",
      thisWeek: { avgPerformanceScore: 80, avgAccessibilityScore: 90, avgSeoScore: 92, avgBestPracticesScore: 88, avgLcp: 2500, avgCls: 0.05, avgInp: 150, runCount: 3 },
      lastWeek: { avgPerformanceScore: 80, avgAccessibilityScore: 90, avgSeoScore: 92, avgBestPracticesScore: 88, avgLcp: 2500, avgCls: 0.05, avgInp: 150, runCount: 3 },
      trend: "stable",
      openAlerts: { critical: 0, moderate: 0, minor: 0 },
      topRegressions: [],
    },
  ],
  summary: { totalSites: 1, sitesImproving: 0, sitesDeclining: 0, totalCriticalAlerts: 0 },
});

describe("processDigestJob", () => {
  beforeEach(() => {
    vi.mocked(aggregateUserDigest).mockReset();
    vi.mocked(sendDigestEmail).mockReset();
  });

  it("queries only users with weeklyDigestEnabled = true", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    await processDigestJob();
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { weeklyDigestEnabled: true },
      })
    );
  });

  it("sends digest to each user who has data", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u1", email: "a@test.com" },
      { id: "u2", email: "b@test.com" },
    ] as never);

    vi.mocked(aggregateUserDigest)
      .mockResolvedValueOnce(makeDigestData("a@test.com"))
      .mockResolvedValueOnce(makeDigestData("b@test.com"));
    vi.mocked(sendDigestEmail).mockResolvedValue(undefined);

    await processDigestJob();

    expect(aggregateUserDigest).toHaveBeenCalledTimes(2);
    expect(sendDigestEmail).toHaveBeenCalledTimes(2);
  });

  it("skips users whose aggregateUserDigest returns null (no data)", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u1", email: "a@test.com" },
      { id: "u2", email: "b@test.com" },
    ] as never);

    vi.mocked(aggregateUserDigest)
      .mockResolvedValueOnce(makeDigestData("a@test.com"))
      .mockResolvedValueOnce(null); // no data this week
    vi.mocked(sendDigestEmail).mockResolvedValue(undefined);

    await processDigestJob();

    expect(sendDigestEmail).toHaveBeenCalledTimes(1);
    const sentData = vi.mocked(sendDigestEmail).mock.calls[0][0] as UserDigestData;
    expect(sentData.user.email).toBe("a@test.com");
  });

  it("skips users whose aggregateUserDigest returns data with no sites", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u1", email: "a@test.com" },
    ] as never);

    const dataNoSites = { ...makeDigestData("a@test.com"), sites: [] };
    vi.mocked(aggregateUserDigest).mockResolvedValueOnce(dataNoSites);

    await processDigestJob();

    expect(sendDigestEmail).not.toHaveBeenCalled();
  });

  it("does not abort the job when one user's send fails — others still receive", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u1", email: "fails@test.com" },
      { id: "u2", email: "ok@test.com" },
    ] as never);

    vi.mocked(aggregateUserDigest)
      .mockResolvedValueOnce(makeDigestData("fails@test.com"))
      .mockResolvedValueOnce(makeDigestData("ok@test.com"));

    vi.mocked(sendDigestEmail)
      .mockRejectedValueOnce(new Error("Resend 500"))
      .mockResolvedValueOnce(undefined);

    // Must not throw
    await expect(processDigestJob()).resolves.toBeUndefined();

    // Second user still got sent despite first failing
    expect(sendDigestEmail).toHaveBeenCalledTimes(2);
    const secondCall = vi.mocked(sendDigestEmail).mock.calls[1][0] as UserDigestData;
    expect(secondCall.user.email).toBe("ok@test.com");
  });

  it("does nothing when no opted-in users exist", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    await processDigestJob();
    expect(aggregateUserDigest).not.toHaveBeenCalled();
    expect(sendDigestEmail).not.toHaveBeenCalled();
  });
});
