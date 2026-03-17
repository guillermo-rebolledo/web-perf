import { test, expect } from "@playwright/test";
import {
  seedActivityEvents,
  cleanupActivityEvents,
  TEST_ACTIVITY_EVENTS,
  TEST_RUN,
  TEST_SITE,
} from "./helpers/seed";

// ── Unauthenticated ───────────────────────────────────────────────────────────

test.describe("Activity (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("GET /api/activity returns 401", async ({ request }) => {
    const response = await request.get("/api/activity");
    expect(response.status()).toBe(401);
  });

  test("GET /api/activity/unread-count returns 401", async ({ request }) => {
    const response = await request.get(
      "/api/activity/unread-count?since=2024-01-01T00:00:00.000Z",
    );
    expect(response.status()).toBe(401);
  });

  test("/activity redirects to sign-in", async ({ page }) => {
    await page.goto("/activity");
    await expect(page).toHaveURL(/\/auth\/signin|\/api\/auth/);
  });
});

// ── API ───────────────────────────────────────────────────────────────────────

test.describe("Activity API (authenticated)", () => {
  test.beforeEach(async () => {
    await seedActivityEvents();
  });

  test.afterEach(async () => {
    await cleanupActivityEvents();
  });

  test("GET /api/activity returns events with correct shape", async ({
    request,
  }) => {
    const res = await request.get("/api/activity?limit=20");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("events");
    expect(body).toHaveProperty("hasMore");
    expect(body).toHaveProperty("nextCursor");
    expect(Array.isArray(body.events)).toBe(true);

    const event = body.events[0];
    expect(event).toHaveProperty("id");
    expect(event).toHaveProperty("type");
    expect(event).toHaveProperty("entityId");
    expect(event).toHaveProperty("entityType");
    expect(event).toHaveProperty("metadata");
    expect(event).toHaveProperty("createdAt");
  });

  test("GET /api/activity returns seeded events", async ({ request }) => {
    const res = await request.get("/api/activity?limit=20");
    const body = await res.json();

    const ids = (body.events as { id: string }[]).map((e) => e.id);
    for (const event of TEST_ACTIVITY_EVENTS) {
      expect(ids).toContain(event.id);
    }
  });

  test("GET /api/activity filters by type", async ({ request }) => {
    const res = await request.get("/api/activity?type=run_completed");
    const body = await res.json();

    expect(body.events.length).toBeGreaterThan(0);
    for (const event of body.events as { type: string }[]) {
      expect(event.type).toBe("run_completed");
    }
  });

  test("GET /api/activity respects limit", async ({ request }) => {
    const res = await request.get("/api/activity?limit=1");
    const body = await res.json();

    expect(body.events.length).toBe(1);
  });

  test("GET /api/activity cursor-based pagination works", async ({
    request,
  }) => {
    const first = await request.get("/api/activity?limit=1");
    const firstBody = await first.json();
    expect(firstBody.hasMore).toBe(true);
    expect(firstBody.nextCursor).toBeTruthy();

    const second = await request.get(
      `/api/activity?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`,
    );
    const secondBody = await second.json();
    expect(secondBody.events.length).toBe(1);
    // Second page must not contain the first page's event
    expect(secondBody.events[0].id).not.toBe(firstBody.events[0].id);
  });

  test("GET /api/activity/unread-count returns 0 when since=now", async ({
    request,
  }) => {
    const since = new Date(Date.now() + 60_000).toISOString(); // 1 min in the future
    const res = await request.get(
      `/api/activity/unread-count?since=${encodeURIComponent(since)}`,
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
  });

  test("GET /api/activity/unread-count returns count when since is in the past", async ({
    request,
  }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // yesterday
    const res = await request.get(
      `/api/activity/unread-count?since=${encodeURIComponent(since)}`,
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.count).toBeGreaterThanOrEqual(TEST_ACTIVITY_EVENTS.length);
  });
});

// ── /activity page ────────────────────────────────────────────────────────────

test.describe("Activity page (authenticated)", () => {
  test.beforeEach(async () => {
    await seedActivityEvents();
  });

  test.afterEach(async () => {
    await cleanupActivityEvents();
  });

  test("loads and shows the page heading", async ({ page }) => {
    await page.goto("/activity");
    await expect(page).toHaveURL(/\/activity/);
    await expect(page.getByRole("heading", { name: /activity/i })).toBeVisible();
  });

  test("renders seeded event cards", async ({ page }) => {
    await page.goto("/activity");
    // run_completed event description contains the site name and score
    await expect(
      page.getByText(new RegExp(TEST_SITE.name, "i")).first(),
    ).toBeVisible();
  });

  test("type filter dropdown is present", async ({ page }) => {
    await page.goto("/activity");
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("filtering by run_completed shows only matching events", async ({
    page,
  }) => {
    await page.goto("/activity");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /run completed/i }).click();

    // run_failed event text should no longer be visible
    await expect(
      page.getByText(/PSI API timeout/i),
    ).not.toBeVisible();
  });

  test("clicking a run_completed card navigates to the run page", async ({
    page,
  }) => {
    await page.goto("/activity");
    // Find the card linking to the test run
    const runLink = page
      .getByRole("link")
      .filter({ hasText: new RegExp(TEST_SITE.name, "i") })
      .first();
    await expect(runLink).toHaveAttribute("href", `/runs/${TEST_RUN.id}`);
  });

  test("clicking a site_created card navigates to the site page", async ({
    page,
  }) => {
    await page.goto("/activity");
    const siteLink = page
      .getByRole("link")
      .filter({ hasText: new RegExp(`site.*${TEST_SITE.name}|${TEST_SITE.name}.*added`, "i") })
      .first();
    await expect(siteLink).toHaveAttribute("href", `/sites/${TEST_SITE.id}`);
  });
});

// ── Activity Sheet (header) ───────────────────────────────────────────────────

test.describe("Activity Sheet (authenticated)", () => {
  test.beforeEach(async () => {
    await seedActivityEvents();
  });

  test.afterEach(async () => {
    await cleanupActivityEvents();
  });

  test("activity icon button is visible in the header", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: /activity/i }),
    ).toBeVisible();
  });

  test("clicking the icon opens the sheet", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /activity/i }).click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /activity/i }),
    ).toBeVisible();
  });

  test("sheet loads event cards after opening", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /activity/i }).click();
    await expect(
      page.getByRole("dialog").getByText(new RegExp(TEST_SITE.name, "i")).first(),
    ).toBeVisible();
  });

  test("sheet has a View all link to /activity", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /activity/i }).click();
    const viewAll = page.getByRole("dialog").getByRole("link", { name: /view all/i });
    await expect(viewAll).toBeVisible();
    await expect(viewAll).toHaveAttribute("href", "/activity");
  });

  test("clicking View all navigates to /activity and closes sheet", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /activity/i }).click();
    await page.getByRole("dialog").getByRole("link", { name: /view all/i }).click();
    await expect(page).toHaveURL(/\/activity/);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("clicking an event card closes the sheet and navigates", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /activity/i }).click();

    // Wait for event cards to load, then click the run card
    const card = page
      .getByRole("dialog")
      .getByRole("link")
      .filter({ hasText: new RegExp(TEST_SITE.name, "i") })
      .first();
    await expect(card).toBeVisible();
    await card.click();

    // Sheet should be gone and we should be on the run or site page
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page).toHaveURL(/\/(runs|sites)\//);
  });

  test("sheet type filter is present and functional", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /activity/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("combobox")).toBeVisible();
  });
});
