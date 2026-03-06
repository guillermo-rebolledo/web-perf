import { describe, it, expect } from "vitest";
import "../../__tests__/helpers/prisma-mock";
import { prismaMock } from "../../__tests__/helpers/prisma-mock";
import { aggregateUserDigest } from "./aggregator";
import { subDays } from "date-fns";

const userId = "user-1";

const makeRun = (
  id: string,
  daysAgo: number,
  overrides: Partial<{
    performanceScore: number;
    lcp: number;
    cls: number;
    inp: number;
  }> = {}
) => ({
  id,
  completedAt: subDays(new Date(), daysAgo),
  performanceScore: overrides.performanceScore ?? 80,
  lcp: overrides.lcp ?? 2500,
  cls: overrides.cls ?? 0.05,
  inp: overrides.inp ?? 150,
});

const baseSite = (runs: ReturnType<typeof makeRun>[], monitorId = "mon-1") => ({
  id: "site-1",
  name: "Acme",
  url: "https://acme.com",
  monitors: [{ id: monitorId, strategy: "mobile", runs }],
});

describe("aggregateUserDigest", () => {
  it("returns null when user has no sites", async () => {
    prismaMock.site.findMany.mockResolvedValue([]);
    const result = await aggregateUserDigest(userId);
    expect(result).toBeNull();
  });

  it("returns null when no successful runs this week", async () => {
    // Only a run from 10 days ago — outside the 7-day window
    prismaMock.site.findMany.mockResolvedValue([
      baseSite([makeRun("r1", 10)]),
    ] as never);

    const result = await aggregateUserDigest(userId);
    expect(result).toBeNull();
  });

  it("computes 'improving' trend when this week score is 5+ points higher", async () => {
    prismaMock.site.findMany.mockResolvedValue([
      baseSite([
        makeRun("r1", 1, { performanceScore: 90 }), // this week
        makeRun("r2", 8, { performanceScore: 70 }), // last week
      ]),
    ] as never);
    prismaMock.regressionAlert.findMany.mockResolvedValue([]);
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: userId,
      email: "test@example.com",
      name: null,
    } as never);

    const result = await aggregateUserDigest(userId);
    expect(result).not.toBeNull();
    expect(result!.sites[0].trend).toBe("improving");
    expect(result!.summary.sitesImproving).toBe(1);
  });

  it("computes 'declining' trend when this week score is 5+ points lower", async () => {
    prismaMock.site.findMany.mockResolvedValue([
      baseSite([
        makeRun("r1", 1, { performanceScore: 60 }), // this week
        makeRun("r2", 8, { performanceScore: 80 }), // last week
      ]),
    ] as never);
    prismaMock.regressionAlert.findMany.mockResolvedValue([]);
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: userId,
      email: "test@example.com",
      name: null,
    } as never);

    const result = await aggregateUserDigest(userId);
    expect(result!.sites[0].trend).toBe("declining");
    expect(result!.summary.sitesDeclining).toBe(1);
  });

  it("counts alert severities correctly", async () => {
    prismaMock.site.findMany.mockResolvedValue([
      baseSite([makeRun("r1", 2)]),
    ] as never);

    prismaMock.regressionAlert.findMany.mockResolvedValue([
      {
        runId: "r1",
        severity: "critical",
        metricName: "lcp",
        percentChange: 30,
        run: { monitorId: "mon-1" },
      },
      {
        runId: "r1",
        severity: "critical",
        metricName: "cls",
        percentChange: 50,
        run: { monitorId: "mon-1" },
      },
      {
        runId: "r1",
        severity: "moderate",
        metricName: "inp",
        percentChange: 20,
        run: { monitorId: "mon-1" },
      },
    ] as never);

    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: userId,
      email: "test@example.com",
      name: null,
    } as never);

    const result = await aggregateUserDigest(userId);
    expect(result!.sites[0].openAlerts).toEqual({
      critical: 2,
      moderate: 1,
      minor: 0,
    });
    expect(result!.summary.totalCriticalAlerts).toBe(2);
  });

  it("limits top regressions to 3 per site, ordered by severity then % change", async () => {
    prismaMock.site.findMany.mockResolvedValue([
      baseSite([makeRun("r1", 1)]),
    ] as never);

    prismaMock.regressionAlert.findMany.mockResolvedValue([
      { runId: "r1", severity: "minor",    metricName: "fcp", percentChange: 10, run: { monitorId: "mon-1" } },
      { runId: "r1", severity: "critical", metricName: "lcp", percentChange: 40, run: { monitorId: "mon-1" } },
      { runId: "r1", severity: "moderate", metricName: "cls", percentChange: 25, run: { monitorId: "mon-1" } },
      { runId: "r1", severity: "critical", metricName: "tbt", percentChange: 60, run: { monitorId: "mon-1" } },
    ] as never);

    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: userId,
      email: "test@example.com",
      name: null,
    } as never);

    const result = await aggregateUserDigest(userId);
    const regs = result!.sites[0].topRegressions;
    expect(regs).toHaveLength(3);
    expect(regs[0].metricName).toBe("tbt"); // critical, highest %
    expect(regs[1].metricName).toBe("lcp"); // critical, lower %
    expect(regs[2].metricName).toBe("cls"); // moderate
  });
});
