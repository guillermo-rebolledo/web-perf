import { describe, it, expect, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient, RegressionAlert } from "@prisma/client";
import { filterNewRegressions } from "../deduplication";
import type { NotificationRegression } from "../types";

/** Cast a partial alert shape to satisfy the mock's expected full type. */
function alertRow(
  partial: Pick<RegressionAlert, "metricName" | "severity">,
): RegressionAlert {
  return partial as unknown as RegressionAlert;
}

function makeRegression(
  overrides: Partial<NotificationRegression> = {},
): NotificationRegression {
  return {
    metricName: "lcp",
    severity: "moderate",
    percentChange: 25,
    baselineValue: 2000,
    actualValue: 2500,
    ...overrides,
  };
}

describe("filterNewRegressions", () => {
  const prismaMock = mockDeep<PrismaClient>();

  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("returns empty array without querying DB when regressions is empty", async () => {
    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      [],
      prismaMock,
    );
    expect(result).toEqual([]);
    expect(prismaMock.regressionAlert.findMany).not.toHaveBeenCalled();
  });

  it("passes through all regressions when no prior unresolved alerts exist", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([]);
    const regressions = [
      makeRegression({ metricName: "lcp", severity: "moderate" }),
      makeRegression({ metricName: "cls", severity: "minor" }),
    ];

    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      regressions,
      prismaMock,
    );
    expect(result).toHaveLength(2);
  });

  it("suppresses a regression when prior unresolved alert has the same severity", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      alertRow({ metricName: "lcp", severity: "moderate" }),
    ]);
    const regressions = [makeRegression({ metricName: "lcp", severity: "moderate" })];

    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      regressions,
      prismaMock,
    );
    expect(result).toHaveLength(0);
  });

  it("suppresses a regression when prior unresolved alert has a higher severity", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      alertRow({ metricName: "lcp", severity: "critical" }),
    ]);
    const regressions = [makeRegression({ metricName: "lcp", severity: "moderate" })];

    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      regressions,
      prismaMock,
    );
    expect(result).toHaveLength(0);
  });

  it("passes through a regression when new severity is strictly higher than prior (escalation)", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      alertRow({ metricName: "lcp", severity: "moderate" }),
    ]);
    const regressions = [makeRegression({ metricName: "lcp", severity: "critical" })];

    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      regressions,
      prismaMock,
    );
    expect(result).toHaveLength(1);
    expect(result[0].metricName).toBe("lcp");
  });

  it("passes through a regression when prior alert was resolved (no rows returned by query)", async () => {
    // The query filters status: { not: "resolved" }, so resolved alerts won't appear
    prismaMock.regressionAlert.findMany.mockResolvedValue([]);
    const regressions = [makeRegression({ metricName: "lcp", severity: "moderate" })];

    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      regressions,
      prismaMock,
    );
    expect(result).toHaveLength(1);
  });

  it("handles mixed regressions — suppresses some and passes others", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      alertRow({ metricName: "lcp", severity: "moderate" }),
    ]);
    const regressions = [
      makeRegression({ metricName: "lcp", severity: "moderate" }), // suppressed
      makeRegression({ metricName: "cls", severity: "minor" }),     // new — passes
      makeRegression({ metricName: "lcp", severity: "critical" }),  // escalation — passes
    ];

    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      regressions,
      prismaMock,
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.severity)).toEqual(
      expect.arrayContaining(["minor", "critical"]),
    );
  });

  it("returns empty array when all regressions are suppressed", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      alertRow({ metricName: "lcp", severity: "critical" }),
      alertRow({ metricName: "cls", severity: "moderate" }),
    ]);
    const regressions = [
      makeRegression({ metricName: "lcp", severity: "moderate" }),
      makeRegression({ metricName: "cls", severity: "minor" }),
    ];

    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      regressions,
      prismaMock,
    );
    expect(result).toHaveLength(0);
  });

  it("uses max severity when multiple prior alerts exist for the same metric", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      alertRow({ metricName: "lcp", severity: "minor" }),
      alertRow({ metricName: "lcp", severity: "moderate" }), // max is moderate
    ]);

    // moderate should be suppressed (prior max = moderate)
    const moderateResult = await filterNewRegressions(
      "monitor-1",
      "run-1",
      [makeRegression({ metricName: "lcp", severity: "moderate" })],
      prismaMock,
    );
    expect(moderateResult).toHaveLength(0);

    prismaMock.regressionAlert.findMany.mockResolvedValue([
      alertRow({ metricName: "lcp", severity: "minor" }),
      alertRow({ metricName: "lcp", severity: "moderate" }), // max is moderate
    ]);

    // critical should pass (escalation over moderate)
    const criticalResult = await filterNewRegressions(
      "monitor-1",
      "run-1",
      [makeRegression({ metricName: "lcp", severity: "critical" })],
      prismaMock,
    );
    expect(criticalResult).toHaveLength(1);
  });

  it("queries DB with correct where clause — excludes current run and resolved alerts", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([]);
    const regressions = [makeRegression({ metricName: "lcp" })];

    await filterNewRegressions("monitor-42", "run-99", regressions, prismaMock);

    expect(prismaMock.regressionAlert.findMany).toHaveBeenCalledWith({
      where: {
        run: { monitorId: "monitor-42" },
        runId: { not: "run-99" },
        status: { not: "resolved" },
        metricName: { in: ["lcp"] },
      },
      select: { metricName: true, severity: true },
    });
  });

  it("treats unknown severity in DB as rank -1, so any known severity escalates", async () => {
    prismaMock.regressionAlert.findMany.mockResolvedValue([
      alertRow({ metricName: "lcp", severity: "unknown_future_value" }),
    ]);
    const regressions = [makeRegression({ metricName: "lcp", severity: "minor" })];

    const result = await filterNewRegressions(
      "monitor-1",
      "run-1",
      regressions,
      prismaMock,
    );
    // minor (rank 0) > unknown (rank -1) → passes through
    expect(result).toHaveLength(1);
  });
});
