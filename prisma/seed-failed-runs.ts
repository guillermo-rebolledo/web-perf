/**
 * Seed script to create test data for failed run scenarios.
 *
 * Usage:
 *   pnpm seed:failed-runs <email> [name]
 *
 * Arguments:
 *   email  - User email address (required)
 *   name   - User display name (optional, defaults to "Test User")
 *
 * Creates:
 * - Test user with provided email
 * - Test site
 * - Test monitor
 * - One queued run
 * - One running run
 * - Several failed runs with different error messages
 * - One successful run (so the monitor has baseline data)
 */

import { PrismaClient, RunStatus } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const userEmail = args[0];
const userName = args[1] ?? "Test User";

if (!userEmail) {
  console.error("❌ Error: Email argument is required\n");
  console.log("Usage:");
  console.log("  pnpm seed:failed-runs <email> [name]\n");
  console.log("Examples:");
  console.log("  pnpm seed:failed-runs user@example.com");
  console.log('  pnpm seed:failed-runs user@example.com "John Doe"\n');
  process.exit(1);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(userEmail)) {
  console.error(`❌ Error: Invalid email format: ${userEmail}\n`);
  process.exit(1);
}

const FAILED_RUNS: Array<{ label: string; errorMessage: string }> = [
  {
    label: "API timeout",
    errorMessage:
      "PageSpeed Insights API request timed out after 30000ms. The target URL may be slow to respond or temporarily unavailable.",
  },
  {
    label: "DNS resolution failure",
    errorMessage:
      "net::ERR_NAME_NOT_RESOLVED — Could not resolve DNS for https://example.com. Check that the URL is correct and the server is reachable.",
  },
  {
    label: "Invalid URL",
    errorMessage:
      "Invalid URL provided to PageSpeed Insights API: the hostname could not be reached (HTTP 404). Verify the site URL in monitor settings.",
  },
  {
    label: "API quota exceeded",
    errorMessage:
      "Google PageSpeed Insights API quota exceeded (HTTP 429). Daily limit reached — the next run will be attempted tomorrow.",
  },
  {
    label: "Unexpected error",
    errorMessage:
      "An unexpected error occurred while processing the audit job: TypeError: Cannot read properties of undefined (reading 'categories'). The PSI response may have been malformed.",
  },
];

async function main() {
  console.log("🌱 Seeding failed run test data...\n");

  // 1. User
  console.log("Creating test user...");
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { email: userEmail, name: userName },
  });
  console.log(`✅ User: ${user.email}\n`);

  // 2. Site
  console.log("Creating test site...");
  const site = await prisma.site.upsert({
    where: { id: "test-site-failed-runs" },
    update: {},
    create: {
      id: "test-site-failed-runs",
      name: "Test Site (failed runs)",
      url: "https://example.com",
      userId: user.id,
    },
  });
  console.log(`✅ Site: ${site.name}\n`);

  // 3. Monitor
  console.log("Creating test monitor...");
  const monitor = await prisma.monitor.upsert({
    where: { id: "test-monitor-failed-runs" },
    update: {},
    create: {
      id: "test-monitor-failed-runs",
      siteId: site.id,
      strategy: "mobile",
      cadenceMinutes: 1440,
      isActive: true,
    },
  });
  console.log(`✅ Monitor: ${monitor.id}\n`);

  // 4. One past successful run (so it doesn't look completely empty)
  console.log("Creating one successful run...");
  const successRun = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: RunStatus.success,
      queuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 12000),
      performanceScore: 84,
      accessibilityScore: 96,
      bestPracticesScore: 91,
      seoScore: 93,
      lcp: 2100,
      inp: 190,
      tbt: 265,
      cls: 0.09,
      fcp: 1550,
      ttfb: 520,
      lighthouseVersion: "12.0.0",
      finalUrl: "https://example.com/",
    },
  });
  console.log(`✅ Successful run: ${successRun.id}\n`);

  // 5. Failed runs
  console.log(`Creating ${FAILED_RUNS.length} failed runs...`);
  const now = Date.now();
  for (let i = 0; i < FAILED_RUNS.length; i++) {
    const { label, errorMessage } = FAILED_RUNS[i]!;
    const hoursBack = (FAILED_RUNS.length - i) * 6; // spread across past days
    const queuedAt = new Date(now - hoursBack * 60 * 60 * 1000);
    const startedAt = new Date(queuedAt.getTime() + 2000);
    const completedAt = new Date(startedAt.getTime() + 5000);

    const run = await prisma.run.create({
      data: {
        monitorId: monitor.id,
        status: RunStatus.failed,
        queuedAt,
        startedAt,
        completedAt,
        errorMessage,
      },
    });
    console.log(`   ✅ [${label}] ${run.id}`);
  }

  // 6. One running run (mid-flight)
  console.log("\nCreating one running run...");
  const runningRun = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: RunStatus.running,
      queuedAt: new Date(Date.now() - 30000),
      startedAt: new Date(Date.now() - 20000),
    },
  });
  console.log(`✅ Running run: ${runningRun.id}\n`);

  // 7. One queued run
  console.log("Creating one queued run...");
  const queuedRun = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: RunStatus.queued,
      queuedAt: new Date(),
    },
  });
  console.log(`✅ Queued run: ${queuedRun.id}\n`);

  console.log("=".repeat(60));
  console.log("✅ Seed completed!\n");
  console.log("Test data created:");
  console.log(`   User:          ${user.email}`);
  console.log(`   Site:          ${site.name} (${site.id})`);
  console.log(`   Monitor:       ${monitor.id}`);
  console.log(`   Successful:    1 run`);
  console.log(`   Failed:        ${FAILED_RUNS.length} runs`);
  console.log(`   Running:       1 run (${runningRun.id})`);
  console.log(`   Queued:        1 run (${queuedRun.id})\n`);
  console.log("To test in the UI:");
  console.log(`   1. Sign in as: ${user.email}`);
  console.log(`   2. Open the "Test Site (failed runs)" site`);
  console.log(
    `   3. Navigate to any failed/queued/running run to verify the UI\n`,
  );
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
