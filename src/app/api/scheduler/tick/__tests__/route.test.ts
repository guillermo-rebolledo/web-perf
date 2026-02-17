import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/env", () => ({
  env: {
    SCHEDULER_SECRET: "test-scheduler-secret-at-least-32-chars",
  },
}));

vi.mock("@/worker/scheduler", () => ({
  processDueMonitors: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/scheduler/tick/route";
import { processDueMonitors } from "@/worker/scheduler";

function makeRequest(secret?: string) {
  const headers = new Headers();
  if (secret) {
    headers.set("x-scheduler-secret", secret);
  }
  return new NextRequest(
    new URL("/api/scheduler/tick", "http://localhost:3000"),
    { method: "POST", headers }
  );
}

describe("POST /api/scheduler/tick", () => {
  it("returns 401 without secret header", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await POST(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("processes due monitors with correct secret", async () => {
    const res = await POST(
      makeRequest("test-scheduler-secret-at-least-32-chars")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(processDueMonitors).toHaveBeenCalled();
  });

  it("returns 500 when processDueMonitors throws", async () => {
    vi.mocked(processDueMonitors).mockRejectedValueOnce(
      new Error("Scheduler failure")
    );

    const res = await POST(
      makeRequest("test-scheduler-secret-at-least-32-chars")
    );
    expect(res.status).toBe(500);
  });
});
