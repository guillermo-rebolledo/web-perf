import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { createSite } from "@/__tests__/helpers/fixtures";
import { GET } from "@/app/api/sites/search/route";

function makeRequest(q?: string, limit?: number) {
  const url = new URL("/api/sites/search", "http://localhost:3000");
  if (q !== undefined) url.searchParams.set("q", q);
  if (limit !== undefined) url.searchParams.set("limit", String(limit));
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/sites/search", () => {
  beforeEach(() => {
    mockAuthenticated();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await GET(makeRequest("test"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when q is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is empty string", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns matching sites case-insensitively", async () => {
    const sites = [
      { id: "site-1", name: "My Blog", url: "https://myblog.com" },
      { id: "site-2", name: "Shop Site", url: "https://shop.com" },
    ];
    prismaMock.site.findMany.mockResolvedValue(sites as ReturnType<typeof createSite>[]);

    const res = await GET(makeRequest("BLOG"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].name).toBe("My Blog");
  });

  it("returns empty array when no sites match", async () => {
    const sites = [
      { id: "site-1", name: "My Blog", url: "https://myblog.com" },
    ];
    prismaMock.site.findMany.mockResolvedValue(sites as ReturnType<typeof createSite>[]);

    const res = await GET(makeRequest("xyznonexistent"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(0);
  });

  it("respects the limit param", async () => {
    const sites = Array.from({ length: 10 }, (_, i) => ({
      id: `site-${i}`,
      name: `Blog Site ${i}`,
      url: `https://blog${i}.com`,
    }));
    prismaMock.site.findMany.mockResolvedValue(sites as ReturnType<typeof createSite>[]);

    const res = await GET(makeRequest("Blog", 3));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results.length).toBeLessThanOrEqual(3);
  });

  it("uses select — results contain only id, name, url", async () => {
    const sites = [{ id: "site-1", name: "Test Site", url: "https://test.com" }];
    prismaMock.site.findMany.mockResolvedValue(sites as ReturnType<typeof createSite>[]);

    const res = await GET(makeRequest("Test"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results[0]).toEqual({
      id: "site-1",
      name: "Test Site",
      url: "https://test.com",
    });
    expect(prismaMock.site.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, name: true, url: true },
      })
    );
  });
});
