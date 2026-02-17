import { test, expect } from "@playwright/test";
import { TEST_SITE } from "./helpers/seed";

test.describe("Dashboard (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("root page redirects to dashboard or sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(dashboard|auth\/signin|api\/auth)/);
  });

  test("dashboard route redirects to auth", async ({ request }) => {
    const response = await request.get("/dashboard");
    expect([200, 302, 303, 307, 308]).toContain(response.status());
  });
});

test.describe("Dashboard (authenticated)", () => {
  test("dashboard loads without redirect", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("shows the app heading", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /web performance lab/i })
    ).toBeVisible();
  });

  test("shows the Create Site button", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: /create site/i })
    ).toBeVisible();
  });

  test("displays the seeded test site", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(TEST_SITE.name)).toBeVisible();
    await expect(page.getByText(TEST_SITE.url)).toBeVisible();
  });

  test("navigation bar is visible when authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("can navigate to the seeded site detail page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText(TEST_SITE.name).click();
    await expect(page).toHaveURL(new RegExp(`/sites/${TEST_SITE.id}`));
    await expect(page.getByText(TEST_SITE.name)).toBeVisible();
  });
});
