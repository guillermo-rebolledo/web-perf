import { test, expect } from "@playwright/test";
import { TEST_SITE } from "./helpers/seed";

test.describe("Site search (⌘K)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("search trigger button is visible in the header", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /search sites/i })
    ).toBeVisible();
  });

  test("opens the search dialog via the trigger button", async ({ page }) => {
    await page.getByRole("button", { name: /search sites/i }).click();
    await expect(
      page.getByPlaceholder("Search your sites…")
    ).toBeVisible();
  });

  test("opens the search dialog via ⌘K shortcut", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await expect(
      page.getByPlaceholder("Search your sites…")
    ).toBeVisible();
  });

  test("shows idle prompt when input is empty", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await expect(
      page.getByText("Type to search across your sites")
    ).toBeVisible();
  });

  test("returns the seeded site when searching by name", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.getByPlaceholder("Search your sites…").fill("E2E Test");
    await expect(page.getByText(TEST_SITE.name)).toBeVisible();
    await expect(page.getByText(TEST_SITE.url)).toBeVisible();
  });

  test("returns results for a fuzzy / partial query", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    // "E2E" is a substring of "E2E Test Site"
    await page.getByPlaceholder("Search your sites…").fill("E2E");
    await expect(page.getByText(TEST_SITE.name)).toBeVisible();
  });

  test("shows empty state when query has no matches", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.getByPlaceholder("Search your sites…").fill("zzznonexistent999");
    await expect(
      page.getByText(/no sites found for/i)
    ).toBeVisible();
  });

  test("clears results after clearing the input", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    const input = page.getByPlaceholder("Search your sites…");
    await input.fill("E2E Test");
    await expect(page.getByRole("option", { name: TEST_SITE.name })).toBeVisible();

    // fill("") triggers React onChange; input.clear() does not
    await input.fill("");
    await expect(page.getByRole("listbox")).not.toBeVisible();
    await expect(
      page.getByText("Type to search across your sites")
    ).toBeVisible();
  });

  test("closes the dialog when Esc is pressed", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await expect(
      page.getByPlaceholder("Search your sites…")
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(
      page.getByPlaceholder("Search your sites…")
    ).not.toBeVisible();
  });

  test("navigates to the site page on Enter", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.getByPlaceholder("Search your sites…").fill("E2E Test");
    // Wait for the result item to be rendered before pressing Enter
    await expect(page.getByRole("option", { name: TEST_SITE.name })).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/sites/${TEST_SITE.id}`));
  });

  test("navigates to the site page on result click", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.getByPlaceholder("Search your sites…").fill("E2E Test");
    // Wait for the option to be stable before clicking
    const option = page.getByRole("option", { name: TEST_SITE.name });
    await expect(option).toBeVisible();
    await option.click();
    await expect(page).toHaveURL(new RegExp(`/sites/${TEST_SITE.id}`));
  });
});
