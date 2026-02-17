#!/usr/bin/env node
/**
 * Manual screenshot cleanup script
 * 
 * Usage:
 *   node scripts/cleanup-screenshots.js [days]
 *   
 * Examples:
 *   node scripts/cleanup-screenshots.js     # Uses default 30 days
 *   node scripts/cleanup-screenshots.js 7   # Cleanup screenshots older than 7 days
 *   node scripts/cleanup-screenshots.js 90  # Cleanup screenshots older than 90 days
 */

import "dotenv/config";
import { cleanupOldScreenshots, getScreenshotStats } from "../src/lib/screenshot-cleanup.js";
import { env } from "../src/env.js";

async function main() {
  const days = process.argv[2] 
    ? parseInt(process.argv[2], 10) 
    : env.SCREENSHOT_TTL_DAYS;

  if (isNaN(days) || days < 1) {
    console.error("Error: Days must be a positive number");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("Screenshot Cleanup Script");
  console.log("=".repeat(60));
  console.log();

  // Show current stats
  console.log("Fetching current screenshot statistics...");
  const statsBefore = await getScreenshotStats();
  console.log();
  console.log("Current Status:");
  console.log(`  Total runs: ${statsBefore.totalRuns}`);
  console.log(`  Runs with screenshots: ${statsBefore.runsWithScreenshots}`);
  console.log(`  Percentage: ${statsBefore.percentageWithScreenshots}%`);
  console.log(`  Old screenshots (>30 days): ${statsBefore.oldRunsWithScreenshots}`);
  console.log();

  // Run cleanup
  console.log(`Running cleanup for screenshots older than ${days} days...`);
  console.log();
  const results = await cleanupOldScreenshots(days);
  console.log();

  // Show results
  console.log("=".repeat(60));
  console.log("Cleanup Results:");
  console.log("=".repeat(60));
  console.log(`  Runs processed: ${results.runsProcessed}`);
  console.log(`  Screenshots deleted: ${results.screenshotsDeleted}`);
  console.log(`  Space freed: ${(results.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
  console.log();

  // Show updated stats
  const statsAfter = await getScreenshotStats();
  console.log("Updated Status:");
  console.log(`  Runs with screenshots: ${statsAfter.runsWithScreenshots} (was ${statsBefore.runsWithScreenshots})`);
  console.log(`  Percentage: ${statsAfter.percentageWithScreenshots}% (was ${statsBefore.percentageWithScreenshots}%)`);
  console.log();
  console.log("=".repeat(60));
  console.log("Cleanup complete!");
  console.log("=".repeat(60));
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
