import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";

import { PATCH, GET } from "@/app/api/regressions/[alertId]/route";

const makeParams = (alertId: string) => ({
  params: Promise.resolve({ alertId }),
});

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL(`http://localhost:3000/api/regressions/alert-1`),
    {
      method,
      ...(body !== undefined && {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    }
  );
}

const baseAlert = {
  id: "alert-1",
  runId: "run-1",
  metricName: "lcp",
  baselineValue: 2000,
  actualValue: 3500,
  delta: 1500,
  percentChange: 75,
  severity: "critical",
  confidence: "high",
  likelyCauses: null,
  diffSummary: null,
  status: "open",
  acknowledgedAt: null,
  acknowledgedBy: null,
  resolvedAt: null,
  resolvedBy: null,
  notes: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  run: {
    id: "run-1",
    monitor: {
      id: "monitor-1",
      site: {
        id: "site-1",
        userId: "test-user-id",
        name: "Test Site",
        url: "https://example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  },
};

describe("GET /api/regressions/[alertId]", () => {
  beforeEach(() => {
    mockAuthenticated();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await GET(makeRequest("GET"), makeParams("alert-1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when alert not found", async () => {
    prismaMock.regressionAlert.findFirst.mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams("alert-1"));
    expect(res.status).toBe(404);
  });

  it("returns alert when found", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.regressionAlert.findFirst.mockResolvedValue(baseAlert as any);
    const res = await GET(makeRequest("GET"), makeParams("alert-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alert.id).toBe("alert-1");
  });
});

describe("PATCH /api/regressions/[alertId]", () => {
  beforeEach(() => {
    mockAuthenticated();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.regressionAlert.findFirst.mockResolvedValue(baseAlert as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await PATCH(
      makeRequest("PATCH", { status: "acknowledged" }),
      makeParams("alert-1")
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status", async () => {
    const res = await PATCH(
      makeRequest("PATCH", { status: "invalid" }),
      makeParams("alert-1")
    );
    expect(res.status).toBe(400);
  });

  it("sets acknowledgedAt and acknowledgedBy when acknowledging", async () => {
    const updatedAlert = { ...baseAlert, status: "acknowledged" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.regressionAlert.update.mockResolvedValue(updatedAlert as any);

    const res = await PATCH(
      makeRequest("PATCH", { status: "acknowledged" }),
      makeParams("alert-1")
    );

    expect(res.status).toBe(200);
    expect(prismaMock.regressionAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "acknowledged",
          acknowledgedAt: expect.any(Date),
          acknowledgedBy: "test-user-id",
        }),
      })
    );
  });

  it("sets resolvedAt and resolvedBy when resolving", async () => {
    const updatedAlert = { ...baseAlert, status: "resolved" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.regressionAlert.update.mockResolvedValue(updatedAlert as any);

    const res = await PATCH(
      makeRequest("PATCH", { status: "resolved" }),
      makeParams("alert-1")
    );

    expect(res.status).toBe(200);
    expect(prismaMock.regressionAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "resolved",
          resolvedAt: expect.any(Date),
          resolvedBy: "test-user-id",
        }),
      })
    );
  });

  it("clears all tracking fields when reopening", async () => {
    const acknowledgedAlert = {
      ...baseAlert,
      status: "acknowledged",
      acknowledgedAt: new Date(),
      acknowledgedBy: "test-user-id",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.regressionAlert.findFirst.mockResolvedValue(acknowledgedAlert as any);
    const updatedAlert = { ...baseAlert, status: "open" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.regressionAlert.update.mockResolvedValue(updatedAlert as any);

    const res = await PATCH(
      makeRequest("PATCH", { status: "open" }),
      makeParams("alert-1")
    );

    expect(res.status).toBe(200);
    expect(prismaMock.regressionAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "open",
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          resolvedBy: null,
        }),
      })
    );
  });

  it("saves optional notes", async () => {
    const updatedAlert = { ...baseAlert, status: "resolved", notes: "Fixed in v1.2" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.regressionAlert.update.mockResolvedValue(updatedAlert as any);

    const res = await PATCH(
      makeRequest("PATCH", { status: "resolved", notes: "Fixed in v1.2" }),
      makeParams("alert-1")
    );

    expect(res.status).toBe(200);
    expect(prismaMock.regressionAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: "Fixed in v1.2",
        }),
      })
    );
  });

  it("returns 404 when alert not found", async () => {
    prismaMock.regressionAlert.findFirst.mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("PATCH", { status: "acknowledged" }),
      makeParams("alert-1")
    );
    expect(res.status).toBe(404);
  });
});
