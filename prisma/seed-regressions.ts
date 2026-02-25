/**
 * Seed script to create test data with regression detection
 *
 * Usage:
 *   pnpm tsx prisma/seed-regressions.ts <email> [name] [numAlerts]
 *
 * Arguments:
 *   email     - User email address (required)
 *   name      - User display name (optional, defaults to "Test User")
 *   numAlerts - Number of regression alerts to create (optional, defaults to 30)
 *
 * Examples:
 *   pnpm tsx prisma/seed-regressions.ts user@example.com
 *   pnpm tsx prisma/seed-regressions.ts user@example.com "John Doe"
 *   pnpm tsx prisma/seed-regressions.ts user@example.com "John Doe" 100
 *
 * Creates:
 * - Test user with provided email
 * - Test site
 * - Test monitor
 * - 30 baseline runs (stable metrics)
 * - N regressed runs distributed across time periods (where N = numAlerts, default 30)
 * - Calculates baselines
 * - Detects regressions
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { calculateBaselines } from "../src/lib/regression/baseline-calculator";
import { detectRegressions } from "../src/lib/regression/detector";
import { analyzeRootCauses } from "../src/lib/regression/rules-engine";
import { calculateDiffSummary } from "../src/lib/regression/diff-engine";
import {
  INSIGHT_FACTORIES,
  REGRESSION_TYPES,
  type InsightData,
} from "./seed-regression-helpers";

const prisma = new PrismaClient();

// Helper to safely convert data to Prisma JSON value
function toJsonValue(data: unknown): Prisma.InputJsonValue {
  return data as Prisma.InputJsonValue;
}

// ── Regression run helper ────────────────────────────────────────────────────

type RegressionBaseline = { metricName: string; medianValue: number };

async function createRegressionRun(
  index: number,
  numAlerts: number,
  monitorId: string,
  baselines: RegressionBaseline[],
): Promise<number> {
  const regressionType = REGRESSION_TYPES[index % REGRESSION_TYPES.length];
  const progressPercent = (((index + 1) / numAlerts) * 100).toFixed(0);

  const daysBack = Math.floor((index / numAlerts) * 30);
  const runDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  console.log(
    `[${progressPercent}%] Creating ${regressionType.name} regression (${daysBack}d ago)...`,
  );

  const baseline = baselines.find((b) => b.metricName === regressionType.metric);
  const regressedValue = (baseline?.medianValue ?? 2000) * regressionType.baseMultiplier;

  const baseMetrics = {
    performanceScore: 70 + Math.random() * 15,
    accessibilityScore: 95,
    bestPracticesScore: 88,
    seoScore: 92,
    lcp: 2100 + Math.random() * 200,
    inp: 200 + Math.random() * 20,
    tbt: 280 + Math.random() * 30,
    cls: 0.09 + Math.random() * 0.01,
    fcp: 1600 + Math.random() * 100,
    ttfb: 550 + Math.random() * 50,
    speedIndex: 3300 + Math.random() * 200,
    tti: 3900 + Math.random() * 200,
    totalByteWeight: 1100000 + Math.floor(Math.random() * 200000),
    numRequests: 55 + Math.floor(Math.random() * 10),
    mainThreadWork: 2200 + Math.random() * 300,
  };

  const regressionRun = await prisma.run.create({
    data: {
      monitorId,
      status: "success",
      queuedAt: runDate,
      startedAt: runDate,
      completedAt: new Date(runDate.getTime() + 10000),
      ...baseMetrics,
      [regressionType.metric]: regressedValue,
    },
  });

  // Build insights from factories
  const insightsData = regressionType.insights
    .map((id) => INSIGHT_FACTORIES[id]?.(regressionRun.id, index))
    .filter((d): d is InsightData => d !== undefined);

  if (insightsData.length > 0) {
    await prisma.insight.createMany({
      data: insightsData.map((d) => ({ ...d, sources: toJsonValue(d.sources) })),
    });
  }

  // Detect regressions and save alerts
  const run = await prisma.run.findUnique({
    where: { id: regressionRun.id },
    include: { monitor: true },
  });

  if (!run) return 0;

  const regressions = await detectRegressions(run, prisma);
  let alertsCreated = 0;

  for (const regression of regressions) {
    const [causes, diffSummary] = await Promise.all([
      analyzeRootCauses(regression.metricName, run, prisma),
      calculateDiffSummary(run, prisma),
    ]);

    await prisma.regressionAlert.create({
      data: {
        ...regression,
        likelyCauses: toJsonValue(causes),
        diffSummary: toJsonValue(diffSummary),
        createdAt: run.completedAt ?? new Date(),
        updatedAt: run.completedAt ?? new Date(),
      },
    });

    alertsCreated++;
  }

  return alertsCreated;
}

// Parse command line arguments
const args = process.argv.slice(2);
const userEmail = args[0];
const userName = args[1] || "Test User";
const numAlertsArg = args[2];
const numAlerts = numAlertsArg ? parseInt(numAlertsArg, 10) : 30;

// Validate email argument
if (!userEmail) {
  console.error("❌ Error: Email argument is required\n");
  console.log("Usage:");
  console.log(
    "  pnpm tsx prisma/seed-regressions.ts <email> [name] [numAlerts]\n",
  );
  console.log("Examples:");
  console.log("  pnpm tsx prisma/seed-regressions.ts user@example.com");
  console.log(
    '  pnpm tsx prisma/seed-regressions.ts user@example.com "John Doe"',
  );
  console.log(
    '  pnpm tsx prisma/seed-regressions.ts user@example.com "John Doe" 100\n',
  );
  process.exit(1);
}

// Basic email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(userEmail)) {
  console.error(`❌ Error: Invalid email format: ${userEmail}\n`);
  process.exit(1);
}

// Validate numAlerts
if (isNaN(numAlerts) || numAlerts < 1 || numAlerts > 1000) {
  console.error(
    `❌ Error: numAlerts must be a number between 1 and 1000 (got: ${numAlertsArg})\n`,
  );
  process.exit(1);
}

async function main() {
  console.log("🌱 Seeding regression test data...\n");
  console.log(`Target alerts to create: ${numAlerts}\n`);

  // 1. Create test user
  console.log("Creating test user...");
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: userName,
    },
  });
  console.log(`✅ User created: ${user.email}\n`);

  // 2. Create test site
  console.log("Creating test site...");
  const site = await prisma.site.upsert({
    where: { id: "test-site-with-regressions" },
    update: {},
    create: {
      id: "test-site-with-regressions",
      name: "Test Site (with regressions)",
      url: "https://example.com",
      userId: user.id,
    },
  });
  console.log(`✅ Site created: ${site.name}\n`);

  // 3. Create test monitor
  console.log("Creating test monitor...");
  const monitor = await prisma.monitor.upsert({
    where: { id: "test-monitor-regressions" },
    update: {},
    create: {
      id: "test-monitor-regressions",
      siteId: site.id,
      strategy: "mobile",
      cadenceMinutes: 1440,
      isActive: true,
    },
  });
  console.log(`✅ Monitor created: ${monitor.strategy}\n`);

  // 4. Create 30 baseline runs (stable metrics)
  console.log("Creating 30 baseline runs...");
  const baselineRuns = [];
  for (let i = 0; i < 30; i++) {
    const run = await prisma.run.create({
      data: {
        monitorId: monitor.id,
        status: "success",
        queuedAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000), // Daily runs going back
        startedAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        completedAt: new Date(
          Date.now() - (30 - i) * 24 * 60 * 60 * 1000 + 10000,
        ),

        // Stable baseline metrics (small random variations)
        performanceScore: 85 + Math.random() * 5,
        accessibilityScore: 95 + Math.random() * 3,
        bestPracticesScore: 90 + Math.random() * 5,
        seoScore: 92 + Math.random() * 4,

        lcp: 2000 + Math.random() * 200, // 2000-2200ms
        inp: 180 + Math.random() * 40, // 180-220ms
        tbt: 250 + Math.random() * 50, // 250-300ms
        cls: 0.08 + Math.random() * 0.02, // 0.08-0.10
        fcp: 1500 + Math.random() * 150, // 1500-1650ms
        ttfb: 500 + Math.random() * 100, // 500-600ms

        speedIndex: 3000 + Math.random() * 300,
        tti: 3500 + Math.random() * 400,
        totalByteWeight: 1000000 + Math.floor(Math.random() * 100000),
        numRequests: 50 + Math.floor(Math.random() * 10),
        mainThreadWork: 2000 + Math.random() * 300,
      },
    });

    // Create some insights for baseline runs
    await prisma.insight.createMany({
      data: [
        {
          runId: run.id,
          insightId: "bootup-time",
          title: "JavaScript execution time",
          description: "Reduce JavaScript execution time",
          score: 0.9,
          sources: [
            { url: "https://example.com/app.js", wastedMs: 200 },
            { url: "https://example.com/vendor.js", wastedMs: 150 },
          ],
        },
        {
          runId: run.id,
          insightId: "network-requests",
          title: "Network requests",
          description: "Minimize network requests",
          score: 0.85,
          sources: Array.from({ length: 50 }, (_, idx) => ({
            url: `https://example.com/resource${idx}.js`,
            transferSize: 10000 + Math.random() * 50000,
            resourceType:
              idx % 3 === 0 ? "script" : idx % 3 === 1 ? "stylesheet" : "image",
          })),
        },
      ],
    });

    baselineRuns.push(run);
  }
  console.log(`✅ Created 30 baseline runs\n`);

  // 5. Calculate baselines
  console.log("Calculating baselines...");
  await calculateBaselines(monitor.id, prisma);

  const baselines = await prisma.regressionBaseline.findMany({
    where: { monitorId: monitor.id },
  });
  console.log(`✅ Baselines calculated for ${baselines.length} metrics:`);
  baselines.forEach((b) => {
    console.log(
      `   - ${b.metricName}: ${b.medianValue.toFixed(2)} (n=${b.sampleSize})`,
    );
  });
  console.log();

  // 6. Create regressed runs dynamically
  console.log(`Creating ${numAlerts} regressed runs...\n`);

  let totalAlertsCreated = 0;

  for (let i = 0; i < numAlerts; i++) {
    totalAlertsCreated += await createRegressionRun(i, numAlerts, monitor.id, baselines);
  }

  console.log(`\n✅ Created ${totalAlertsCreated} regression alerts\n`);

  // Summary
  console.log("=".repeat(60));
  console.log("✅ Seed completed successfully!\n");
  console.log("Test data created:");
  console.log(`   - User: ${user.email}`);
  console.log(`   - Site: ${site.name}`);
  console.log(`   - Monitor: ${monitor.id}`);
  console.log(`   - Baseline runs: 30`);
  console.log(`   - Regressed runs: ${numAlerts}`);
  console.log(`   - Regression alerts created: ${totalAlertsCreated}\n`);

  const alerts = await prisma.regressionAlert.findMany({
    where: { run: { monitorId: monitor.id } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Total regression alerts created: ${alerts.length}`);

  // Group alerts by time period
  const now = Date.now();
  const alertsByPeriod = {
    "1d": alerts.filter(
      (a) => now - a.createdAt.getTime() <= 1 * 24 * 60 * 60 * 1000,
    ).length,
    "3d": alerts.filter(
      (a) => now - a.createdAt.getTime() <= 3 * 24 * 60 * 60 * 1000,
    ).length,
    "5d": alerts.filter(
      (a) => now - a.createdAt.getTime() <= 5 * 24 * 60 * 60 * 1000,
    ).length,
    "10d": alerts.filter(
      (a) => now - a.createdAt.getTime() <= 10 * 24 * 60 * 60 * 1000,
    ).length,
    "30d": alerts.filter(
      (a) => now - a.createdAt.getTime() <= 30 * 24 * 60 * 60 * 1000,
    ).length,
  };

  console.log("\nAlerts by time period:");
  console.log(`   - Last 1 day:   ${alertsByPeriod["1d"]} alerts`);
  console.log(`   - Last 3 days:  ${alertsByPeriod["3d"]} alerts`);
  console.log(`   - Last 5 days:  ${alertsByPeriod["5d"]} alerts`);
  console.log(`   - Last 10 days: ${alertsByPeriod["10d"]} alerts`);
  console.log(`   - Last 30 days: ${alertsByPeriod["30d"]} alerts`);

  console.log("\nTo view in UI:");
  console.log(`   1. Sign in as: ${user.email}`);
  console.log(`   2. Navigate to "Regression Alerts" in the sidebar`);
  console.log(`   3. Switch between time period tabs to see alerts\n`);
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
