import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { GET } from "@/app/api/activity/route";

function makeRequest(url: string) {
  const urlObj = new URL(url, "http://localhost:3000");
  return new NextRequest(urlObj, { method: "GET" });
}

function createActivityEvent(overrides: Partial<{
  id: string;
  userId: string;
  type: string;
  entityId: string;
  entityType: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}> = {}) {
  return {
    id: "event-1",
    userId: "test-user-id",
    type: "run_completed",
    entityId: "run-1",
    entityType: "run",
    metadata: { type: "run_completed", siteName: "Test Site", siteUrl: "https://example.com", siteId: "site-1", monitorId: "monitor-1", performanceScore: 85 } as Prisma.JsonValue,
    createdAt: new Date("2026-03-16T00:00:00Z"),
    ...overrides,
  };
}

describe("GET /api/activity", () => {
  beforeEach(() => {
    mockAuthenticated();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await GET(makeRequest("/api/activity"));
    expect(res.status).toBe(401);
  });

  it("returns events for authenticated user", async () => {
    const events = [createActivityEvent(), createActivityEvent({ id: "event-2", type: "site_created" })];
    vi.mocked(prismaMock.activityEvent.findMany).mockResolvedValue(events);

    const res = await GET(makeRequest("/api/activity"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.events).toHaveLength(2);
    expect(data.hasMore).toBe(false);
    expect(data.nextCursor).toBeNull();
  });

  it("returns hasMore=true and nextCursor when more results exist", async () => {
    // Return 21 events (limit + 1) to indicate there are more
    const baseTime = new Date("2026-03-16T00:00:00Z").getTime();
    const events = Array.from({ length: 21 }, (_, i) =>
      createActivityEvent({ id: `event-${i}`, createdAt: new Date(baseTime - i * 1000) })
    );
    vi.mocked(prismaMock.activityEvent.findMany).mockResolvedValue(events);

    const res = await GET(makeRequest("/api/activity?limit=20"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.events).toHaveLength(20);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).not.toBeNull();
  });

  it("accepts a type filter", async () => {
    vi.mocked(prismaMock.activityEvent.findMany).mockResolvedValue([]);

    await GET(makeRequest("/api/activity?type=run_completed"));

    expect(prismaMock.activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "run_completed" }),
      })
    );
  });

  it("clamps limit between 1 and 100", async () => {
    vi.mocked(prismaMock.activityEvent.findMany).mockResolvedValue([]);

    await GET(makeRequest("/api/activity?limit=500"));

    expect(prismaMock.activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 101 }) // 100 + 1
    );
  });

  it("returns 400 for invalid cursor", async () => {
    const res = await GET(makeRequest("/api/activity?cursor=invalidcursor"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for cursor with invalid date", async () => {
    const res = await GET(makeRequest("/api/activity?cursor=notadate_eventid"));
    expect(res.status).toBe(400);
  });

  it("serializes createdAt as ISO string", async () => {
    const event = createActivityEvent({ createdAt: new Date("2026-03-16T12:00:00.000Z") });
    vi.mocked(prismaMock.activityEvent.findMany).mockResolvedValue([event]);

    const res = await GET(makeRequest("/api/activity"));
    const data = await res.json();

    expect(data.events[0].createdAt).toBe("2026-03-16T12:00:00.000Z");
  });
});
