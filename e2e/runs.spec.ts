import { test, expect } from "@playwright/test";
import { TEST_RUN, TEST_SITE } from "./helpers/seed";

test.describe("Runs pages (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("run detail page redirects to auth when unauthenticated", async ({
    page,
  }) => {
    await page.goto(`/runs/${TEST_RUN.id}`);
    await expect(page).toHaveURL(/\/auth\/signin|\/api\/auth/);
  });

  test("GET /api/runs/:id returns 401", async ({ request }) => {
    const response = await request.get(`/api/runs/${TEST_RUN.id}`);
    expect(response.status()).toBe(401);
  });

  test("GET /api/runs/:id/compare/:id2 returns 401", async ({ request }) => {
    const response = await request.get("/api/runs/run1/compare/run2");
    expect(response.status()).toBe(401);
  });
});

test.describe("Run detail page (authenticated)", () => {
  test("displays the run detail page with scores", async ({ page }) => {
    await page.goto(`/runs/${TEST_RUN.id}`);
    await expect(page).toHaveURL(new RegExp(`/runs/${TEST_RUN.id}`));

    // Should show the site name (appears in breadcrumb and subtitle)
    await expect(page.getByText(TEST_SITE.name).first()).toBeVisible();

    // Should show performance score
    await expect(
      page.getByText(String(TEST_RUN.performanceScore)).first()
    ).toBeVisible();
  });

  test("displays Core Web Vitals", async ({ page }) => {
    await page.goto(`/runs/${TEST_RUN.id}`);

    // Check for CWV labels
    await expect(page.getByText("LCP")).toBeVisible();
    await expect(page.getByText("CLS")).toBeVisible();
    await expect(page.getByText("FCP")).toBeVisible();
    await expect(page.getByText("TTFB")).toBeVisible();
  });

  test("displays audit results", async ({ page }) => {
    await page.goto(`/runs/${TEST_RUN.id}`);

    // Should show the Audits section heading
    await expect(
      page.getByRole("heading", { name: /audits/i })
    ).toBeVisible();

    // Should show an audit row -- use the table cell to avoid matching MetricBadge descriptions
    await expect(
      page.getByRole("cell", { name: "First Contentful Paint" })
    ).toBeVisible();
  });

  test("has breadcrumb navigation to the site", async ({ page }) => {
    await page.goto(`/runs/${TEST_RUN.id}`);
    // Breadcrumb shows site name as a link back to the site page
    const siteLink = page.getByRole("link", { name: TEST_SITE.name });
    await expect(siteLink).toBeVisible();
    await expect(siteLink).toHaveAttribute("href", `/sites/${TEST_SITE.id}`);
  });
});

test.describe("Site detail page (authenticated)", () => {
  test("shows monitors and run history", async ({ page }) => {
    await page.goto(`/sites/${TEST_SITE.id}`);
    await expect(page).toHaveURL(new RegExp(`/sites/${TEST_SITE.id}`));
    // Site detail page shows the URL in the description
    await expect(page.getByText(TEST_SITE.url)).toBeVisible();

    // Should show the monitor heading with strategy
    await expect(page.getByText(/mobile monitor/i)).toBeVisible();

    // Should show a Run Now button
    await expect(
      page.getByRole("button", { name: /run now/i })
    ).toBeVisible();
  });

  test("shows the run in the run history table", async ({ page }) => {
    await page.goto(`/sites/${TEST_SITE.id}`);

    // The run should appear with its status badge
    await expect(page.getByText("success").first()).toBeVisible();

    // Should show a View Details link
    await expect(
      page.getByRole("link", { name: /view details/i }).first()
    ).toBeVisible();
  });

  test("can navigate from run history to run detail", async ({ page }) => {
    await page.goto(`/sites/${TEST_SITE.id}`);
    await page.getByRole("link", { name: /view details/i }).first().click();
    // waitForURL makes the navigation wait explicit — toHaveURL alone can race
    // against Next.js client-side routing in CI where the dev server is slower.
    await page.waitForURL(/\/runs\//, { timeout: 15_000 });
  });
});
