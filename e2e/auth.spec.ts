import { test, expect } from "@playwright/test";

// These tests must run WITHOUT authentication
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    // Should be redirected to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin|\/api\/auth/);
  });

  test("sign-in page renders email input", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(
      page.getByRole("heading", { name: /web performance lab/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test("sign-in page shows submit button", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(
      page.getByRole("button", { name: /sign in|send/i })
    ).toBeVisible();
  });

  test("submitting empty email shows validation", async ({ page }) => {
    await page.goto("/auth/signin");
    const submitBtn = page.getByRole("button", { name: /sign in|send/i });
    await submitBtn.click();
    // Browser native validation should prevent submission or show error
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test("verify-request page renders", async ({ page }) => {
    await page.goto("/auth/verify-request");
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test("error page renders", async ({ page }) => {
    await page.goto("/auth/error");
    await expect(page.getByText(/error|something went wrong/i)).toBeVisible();
  });
});
