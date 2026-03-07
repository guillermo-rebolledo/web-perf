import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { GET, POST } from "@/app/api/integrations/route";
import { PATCH, DELETE } from "@/app/api/integrations/[id]/route";
import { POST as TEST_POST } from "@/app/api/integrations/[id]/test/route";

function makeRequest(method: string, url: string, body?: unknown) {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    ...init,
    signal: undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const BASE_INTEGRATION = {
  id: "int-1",
  userId: "test-user-id",
  name: "Slack #alerts",
  type: "slack",
  config: { type: "slack", webhookUrl: "https://hooks.slack.com/services/test" },
  isActive: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

describe("GET /api/integrations", () => {
  beforeEach(() => mockAuthenticated());

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await GET(makeRequest("GET", "/api/integrations"));
    expect(res.status).toBe(401);
  });

  it("returns integrations with monitorCount", async () => {
    vi.mocked(prismaMock.integration.findMany).mockResolvedValue([
      { ...BASE_INTEGRATION, _count: { monitorIntegrations: 2 } } as never,
    ]);
    const res = await GET(makeRequest("GET", "/api/integrations"));
    const data = (await res.json()) as { integrations: { monitorCount: number }[] };
    expect(res.status).toBe(200);
    expect(data.integrations[0].monitorCount).toBe(2);
  });
});

describe("POST /api/integrations", () => {
  beforeEach(() => mockAuthenticated());

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await POST(
      makeRequest("POST", "/api/integrations", {
        name: "Test",
        type: "slack",
        webhookUrl: "https://hooks.slack.com/services/x",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid webhook URL", async () => {
    const res = await POST(
      makeRequest("POST", "/api/integrations", {
        name: "Test",
        type: "slack",
        webhookUrl: "not-a-url",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(
      makeRequest("POST", "/api/integrations", {
        type: "slack",
        webhookUrl: "https://hooks.slack.com/services/x",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 422 when integration limit is reached", async () => {
    vi.mocked(prismaMock.integration.count).mockResolvedValue(10);

    const res = await POST(
      makeRequest("POST", "/api/integrations", {
        name: "One Too Many",
        type: "slack",
        webhookUrl: "https://hooks.slack.com/services/test",
      }),
    );
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(422);
    expect(data.error).toContain("limit reached");
    expect(prismaMock.integration.create).not.toHaveBeenCalled();
  });

  it("creates integration and returns 200", async () => {
    vi.mocked(prismaMock.integration.create).mockResolvedValue({
      ...BASE_INTEGRATION,
      _count: { monitorIntegrations: 0 },
    } as never);

    const res = await POST(
      makeRequest("POST", "/api/integrations", {
        name: "Slack #alerts",
        type: "slack",
        webhookUrl: "https://hooks.slack.com/services/test",
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { integration: { name: string } };
    expect(data.integration.name).toBe("Slack #alerts");
  });

  it("validates monitorIds ownership when provided", async () => {
    vi.mocked(prismaMock.monitor.count).mockResolvedValue(0); // none match user
    const res = await POST(
      makeRequest("POST", "/api/integrations", {
        name: "Slack",
        type: "slack",
        webhookUrl: "https://hooks.slack.com/services/test",
        monitorIds: ["monitor-9999"],
      }),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid monitor/);
  });
});

describe("PATCH /api/integrations/[id]", () => {
  beforeEach(() => mockAuthenticated());

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await PATCH(makeRequest("PATCH", "/api/integrations/int-1", { name: "X" }), makeParams("int-1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when integration not found", async () => {
    vi.mocked(prismaMock.integration.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", "/api/integrations/int-1", { name: "X" }), makeParams("int-1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when integration belongs to another user", async () => {
    vi.mocked(prismaMock.integration.findUnique).mockResolvedValue({
      ...BASE_INTEGRATION,
      userId: "other-user",
    } as never);
    const res = await PATCH(makeRequest("PATCH", "/api/integrations/int-1", { name: "X" }), makeParams("int-1"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/integrations/[id]", () => {
  beforeEach(() => mockAuthenticated());

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await DELETE(makeRequest("DELETE", "/api/integrations/int-1"), makeParams("int-1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when integration belongs to another user", async () => {
    vi.mocked(prismaMock.integration.findUnique).mockResolvedValue({
      ...BASE_INTEGRATION,
      userId: "other-user",
    } as never);
    const res = await DELETE(makeRequest("DELETE", "/api/integrations/int-1"), makeParams("int-1"));
    expect(res.status).toBe(404);
  });

  it("deletes and returns success", async () => {
    vi.mocked(prismaMock.integration.findUnique).mockResolvedValue(BASE_INTEGRATION as never);
    vi.mocked(prismaMock.integration.delete).mockResolvedValue(BASE_INTEGRATION as never);
    const res = await DELETE(makeRequest("DELETE", "/api/integrations/int-1"), makeParams("int-1"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean };
    expect(data.success).toBe(true);
  });
});

describe("POST /api/integrations/[id]/test", () => {
  beforeEach(() => {
    mockAuthenticated();
    // Mock fetch for slack webhook call
    global.fetch = vi.fn();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await TEST_POST(makeRequest("POST", "/api/integrations/int-1/test"), makeParams("int-1"));
    expect(res.status).toBe(401);
  });

  it("always returns HTTP 200 with ok:true on success", async () => {
    vi.mocked(prismaMock.integration.findUnique).mockResolvedValue(BASE_INTEGRATION as never);
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const res = await TEST_POST(makeRequest("POST", "/api/integrations/int-1/test"), makeParams("int-1"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(true);
  });

  it("returns HTTP 200 with ok:false and error on failure", async () => {
    vi.mocked(prismaMock.integration.findUnique).mockResolvedValue(BASE_INTEGRATION as never);
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "invalid_token",
    });

    const res = await TEST_POST(makeRequest("POST", "/api/integrations/int-1/test"), makeParams("int-1"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
    expect(data.error).toBeDefined();
  });
});
