import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { seedTestData, TEST_USER, disconnect } from "./helpers/seed";
import dotenv from "dotenv";
import path from "path";

// Load .env from project root so NEXTAUTH_SECRET is available
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const STORAGE_STATE_PATH = path.resolve(__dirname, ".auth/user.json");
const COOKIE_NAME = "authjs.session-token";

setup("seed database and create authenticated session", async ({ page }) => {
  // 1. Seed test data into the database
  await seedTestData();

  // 2. Encode a JWT matching what the app's jwt callback returns
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Make sure .env exists in the project root."
    );
  }

  const token = await encode({
    token: {
      id: TEST_USER.id,
      name: TEST_USER.name,
      email: TEST_USER.email,
      picture: null,
      sub: TEST_USER.id,
    },
    secret,
    salt: COOKIE_NAME,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // 3. Set the session cookie in the browser context
  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // 4. Verify the session works by navigating to the dashboard
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/);

  // 5. Save storage state for all authenticated specs to reuse
  await page.context().storageState({ path: STORAGE_STATE_PATH });

  // Disconnect Prisma
  await disconnect();
});
