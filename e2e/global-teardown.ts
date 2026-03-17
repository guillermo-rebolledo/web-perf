import { cleanup, disconnect } from "./helpers/seed";

/**
 * Runs once after the entire Playwright suite finishes.
 * Deletes the E2E test user (cascades to all related data) and closes
 * the Prisma connection so the process exits cleanly.
 */
export default async function globalTeardown() {
  await cleanup();
  await disconnect();
}
