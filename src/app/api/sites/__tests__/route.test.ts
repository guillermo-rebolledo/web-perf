import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Site } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { createSite } from "@/__tests__/helpers/fixtures";
import { GET, POST } from "@/app/api/sites/route";

function makeRequest(method: string, url: string, body?: unknown) {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  const urlObj = new URL(url, "http://localhost:3000");
  return new NextRequest(urlObj, { ...init, signal: init.signal ?? undefined });
}

describe("GET /api/sites", () => {
  beforeEach(() => {
    mockAuthenticated();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await GET(makeRequest("GET", "/api/sites"));
    expect(res.status).toBe(401);
  });

  it("returns user sites", async () => {
    const sites = [
      { ...createSite(), monitors: [] },
      { ...createSite({ id: "site-2", name: "Site 2" }), monitors: [] },
    ];
    vi.mocked(prismaMock.site.findMany).mockResolvedValue(sites as (Site & { monitors: unknown[] })[]);

    const res = await GET(makeRequest("GET", "/api/sites"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Test Site");
  });
});

describe("POST /api/sites", () => {
  beforeEach(() => {
    mockAuthenticated();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await POST(
      makeRequest("POST", "/api/sites", {
        name: "Test",
        url: "https://example.com",
      })
    );
    expect(res.status).toBe(401);
  });

  it("validates request body", async () => {
    const res = await POST(
      makeRequest("POST", "/api/sites", { name: "", url: "not-a-url" })
    );
    expect(res.status).toBe(400);
  });

  it("rejects duplicate site URLs for the same user", async () => {
    vi.mocked(prismaMock.site.findFirst).mockResolvedValue(createSite());

    const res = await POST(
      makeRequest("POST", "/api/sites", {
        name: "Duplicate",
        url: "https://example.com",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("already exists");
  });

  it("returns 422 when site limit is reached", async () => {
    vi.mocked(prismaMock.site.count).mockResolvedValue(25);

    const res = await POST(
      makeRequest("POST", "/api/sites", {
        name: "One Too Many",
        url: "https://example.com",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error).toContain("limit reached");
    expect(prismaMock.site.create).not.toHaveBeenCalled();
  });

  it("creates a new site with canonicalized URL", async () => {
    vi.mocked(prismaMock.site.findFirst).mockResolvedValue(null);
    vi.mocked(prismaMock.site.create).mockResolvedValue(
      createSite({ url: "https://example.com/" })
    );

    const res = await POST(
      makeRequest("POST", "/api/sites", {
        name: "New Site",
        url: "http://www.example.com",
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.site.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          url: "https://example.com/",
        }),
      })
    );
  });
});
