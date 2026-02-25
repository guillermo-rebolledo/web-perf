/**
 * Database cleanup script
 *
 * Usage:
 *   pnpm tsx prisma/clean-db.ts
 *
 * Removes all performance monitoring data while preserving:
 * - Users
 * - Sessions (keeps you logged in)
 * - Accounts (authentication providers)
 * - Verification tokens
 *
 * Deletes:
 * - Sites
 * - Monitors
 * - Runs
 * - Audits
 * - Insights
 * - Regression alerts
 * - Regression baselines
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning database...\n");

  try {
    // Delete in the correct order to respect foreign key constraints

    console.log("Deleting regression alerts...");
    const deletedAlerts = await prisma.regressionAlert.deleteMany({});
    console.log(`✅ Deleted ${deletedAlerts.count} regression alerts\n`);

    console.log("Deleting regression baselines...");
    const deletedBaselines = await prisma.regressionBaseline.deleteMany({});
    console.log(`✅ Deleted ${deletedBaselines.count} regression baselines\n`);

    console.log("Deleting insights...");
    const deletedInsights = await prisma.insight.deleteMany({});
    console.log(`✅ Deleted ${deletedInsights.count} insights\n`);

    console.log("Deleting audits...");
    const deletedAudits = await prisma.audit.deleteMany({});
    console.log(`✅ Deleted ${deletedAudits.count} audits\n`);

    console.log("Deleting runs...");
    const deletedRuns = await prisma.run.deleteMany({});
    console.log(`✅ Deleted ${deletedRuns.count} runs\n`);

    console.log("Deleting monitors...");
    const deletedMonitors = await prisma.monitor.deleteMany({});
    console.log(`✅ Deleted ${deletedMonitors.count} monitors\n`);

    console.log("Deleting sites...");
    const deletedSites = await prisma.site.deleteMany({});
    console.log(`✅ Deleted ${deletedSites.count} sites\n`);

    console.log("=".repeat(60));
    console.log("✅ Database cleaned successfully!\n");
    console.log("Preserved:");
    console.log("   ✓ User accounts");
    console.log("   ✓ Active sessions");
    console.log("   ✓ Authentication providers\n");
    console.log("You can now run the seed script to create fresh test data:");
    console.log("   pnpm tsx prisma/seed-regressions.ts\n");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
