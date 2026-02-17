import { test, expect } from "@playwright/test";
import { TEST_SITE, TEST_MONITOR, TEST_RUN } from "./helpers/seed";

test.describe("API - Unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("GET /api/sites returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/sites");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/sites returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/sites", {
      data: { name: "Test", url: "https://example.com" },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /api/monitors returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/monitors?siteId=test");
    expect(response.status()).toBe(401);
  });

  test("POST /api/monitors returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/monitors", {
      data: { siteId: "test", cadenceMinutes: 60 },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /api/runs returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/runs?monitorId=test");
    expect(response.status()).toBe(401);
  });

  test("POST /api/scheduler/tick returns 401 without secret", async ({
    request,
  }) => {
    const response = await request.post("/api/scheduler/tick");
    expect(response.status()).toBe(401);
  });

  test("POST /api/scheduler/tick returns 401 with wrong secret", async ({
    request,
  }) => {
    const response = await request.post("/api/scheduler/tick", {
      headers: { "x-scheduler-secret": "wrong-secret" },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("API - Authenticated", () => {
  test("GET /api/sites returns the seeded site", async ({ request }) => {
    const response = await request.get("/api/sites");
    expect(response.status()).toBe(200);
    const sites = await response.json();
    expect(sites.length).toBeGreaterThanOrEqual(1);
    const testSite = sites.find(
      (s: { id: string }) => s.id === TEST_SITE.id
    );
    expect(testSite).toBeDefined();
    expect(testSite.name).toBe(TEST_SITE.name);
    expect(testSite.url).toBe(TEST_SITE.url);
  });

  test("GET /api/monitors returns monitors for the seeded site", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/monitors?siteId=${TEST_SITE.id}`
    );
    expect(response.status()).toBe(200);
    const monitors = await response.json();
    expect(monitors.length).toBeGreaterThanOrEqual(1);
    expect(monitors[0].id).toBe(TEST_MONITOR.id);
  });

  test("GET /api/runs returns runs for the seeded monitor", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/runs?monitorId=${TEST_MONITOR.id}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.runs.length).toBeGreaterThanOrEqual(1);
    expect(body.runs[0].id).toBe(TEST_RUN.id);
  });

  test("GET /api/runs/:id returns the seeded run with audits", async ({
    request,
  }) => {
    const response = await request.get(`/api/runs/${TEST_RUN.id}`);
    expect(response.status()).toBe(200);
    const run = await response.json();
    expect(run.id).toBe(TEST_RUN.id);
    expect(run.performanceScore).toBe(TEST_RUN.performanceScore);
    expect(run.audits.length).toBeGreaterThanOrEqual(1);
  });

  test("POST /api/sites creates a new site", async ({ request }) => {
    const response = await request.post("/api/sites", {
      data: { name: "E2E Created Site", url: "https://e2e-created.example.com" },
    });
    expect(response.status()).toBe(201);
    const site = await response.json();
    expect(site.name).toBe("E2E Created Site");
    expect(site.url).toBe("https://e2e-created.example.com/");

    // Clean up: delete the created site
    const deleteResponse = await request.delete(`/api/sites/${site.id}`);
    expect(deleteResponse.status()).toBe(200);
  });

  test("GET /api/sites/:id returns the seeded site with monitors", async ({
    request,
  }) => {
    const response = await request.get(`/api/sites/${TEST_SITE.id}`);
    expect(response.status()).toBe(200);
    const site = await response.json();
    expect(site.name).toBe(TEST_SITE.name);
    expect(site.monitors.length).toBeGreaterThanOrEqual(1);
  });
});
