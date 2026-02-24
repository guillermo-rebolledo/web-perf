/**
 * Seed script to create test data with regression detection
 *
 * Usage:
 *   pnpm tsx prisma/seed-regressions.ts
 *   IMPORTANT: Change the email and name to your own before running the script to avoid conflicts.
 *
 * Creates:
 * - Test user
 * - Test site
 * - Test monitor
 * - 30 baseline runs (stable metrics)
 * - 3 regressed runs (LCP, TBT, CLS regressions)
 * - Calculates baselines
 * - Detects regressions
 */

import { PrismaClient } from "@prisma/client";
import { calculateBaselines } from "../src/lib/regression/baseline-calculator";
import { detectRegressions } from "../src/lib/regression/detector";
import { analyzeRootCauses } from "../src/lib/regression/rules-engine";
import { calculateDiffSummary } from "../src/lib/regression/diff-engine";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding regression test data...\n");

  // 1. Create test user
  console.log("Creating test user...");
  const user = await prisma.user.upsert({
    where: { email: "gortiz.dev@gmail.com" },
    update: {},
    create: {
      email: "gortiz.dev@gmail.com",
      name: "Test User",
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

  // 6. Create regressed runs
  console.log("Creating regressed runs...\n");

  // Regression 1: LCP regression (JS bloat + third-party)
  console.log("Creating Regression 1: LCP regression...");
  const lcpRegression = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: "success",
      queuedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 10000),

      performanceScore: 70,
      accessibilityScore: 95,
      bestPracticesScore: 88,
      seoScore: 92,

      lcp: 3200, // +60% from baseline (~2100ms) - CRITICAL
      inp: 200,
      tbt: 280,
      cls: 0.09,
      fcp: 1600,
      ttfb: 550,

      speedIndex: 3500,
      tti: 4200,
      totalByteWeight: 1500000, // +500KB
      numRequests: 65, // +15 requests
      mainThreadWork: 2800, // +800ms
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        runId: lcpRegression.id,
        insightId: "bootup-time",
        title: "JavaScript execution time",
        description: "Reduce JavaScript execution time",
        score: 0.6, // Worsened from 0.9
        sources: [
          { url: "https://example.com/app.js", wastedMs: 400 }, // Increased
          { url: "https://example.com/vendor.js", wastedMs: 300 }, // Increased
          { url: "https://analytics.newdomain.com/tracker.js", wastedMs: 420 }, // NEW!
        ],
      },
      {
        runId: lcpRegression.id,
        insightId: "third-party-summary",
        title: "Third-party code",
        description: "Third-party scripts blocking the main thread",
        score: 0.5,
        sources: [
          {
            url: "https://analytics.newdomain.com",
            blockingTime: 420,
            transferSize: 210000,
          }, // NEW DOMAIN
        ],
      },
      {
        runId: lcpRegression.id,
        insightId: "network-requests",
        title: "Network requests",
        description: "Minimize network requests",
        score: 0.75,
        sources: Array.from({ length: 65 }, (_, idx) => ({
          url:
            idx === 64
              ? "https://analytics.newdomain.com/tracker.js" // New third-party
              : `https://example.com/resource${idx}.js`,
          transferSize: idx === 64 ? 210000 : 10000 + Math.random() * 50000,
          resourceType:
            idx === 64
              ? "script"
              : idx % 3 === 0
                ? "script"
                : idx % 3 === 1
                  ? "stylesheet"
                  : "image",
        })),
      },
      {
        runId: lcpRegression.id,
        insightId: "largest-contentful-paint-element",
        title: "LCP element",
        description: "LCP element changed",
        score: 0.7,
        sources: [
          {
            url: "https://example.com/hero-large.jpg",
            element: '{"selector": "img.hero"}',
          },
        ],
      },
    ],
  });

  // Detect and analyze this regression
  const lcpRun = await prisma.run.findUnique({
    where: { id: lcpRegression.id },
    include: { monitor: true },
  });

  if (lcpRun) {
    const regressions = await detectRegressions(lcpRun as any, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        lcpRun as any,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(lcpRun as any, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as any,
          diffSummary: diffSummary as any,
        },
      });

      console.log(
        `   ✅ ${regression.metricName.toUpperCase()}: ${regression.severity} (${regression.confidence} confidence)`,
      );
      if (causes.length > 0) {
        console.log(
          `      Top cause: ${causes[0].title} (${causes[0].confidence}% confidence)`,
        );
      }
    }
  }
  console.log();

  // Regression 2: TBT regression (main thread contention)
  console.log("Creating Regression 2: TBT regression...");
  const tbtRegression = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: "success",
      queuedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000 + 10000),

      performanceScore: 75,
      accessibilityScore: 95,
      bestPracticesScore: 88,
      seoScore: 92,

      lcp: 2150,
      inp: 250,
      tbt: 450, // +80% from baseline (~250ms) - CRITICAL
      cls: 0.09,
      fcp: 1600,
      ttfb: 550,

      speedIndex: 3400,
      tti: 4000,
      totalByteWeight: 1100000,
      numRequests: 58,
      mainThreadWork: 3200, // +1200ms
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        runId: tbtRegression.id,
        insightId: "long-tasks",
        title: "Long tasks",
        description: "Avoid long main-thread tasks",
        score: 0.4,
        sources: [
          { url: "https://example.com/app.js", duration: 300 },
          { url: "https://example.com/vendor.js", duration: 250 },
          { url: "https://example.com/analytics.js", duration: 200 },
        ],
      },
      {
        runId: tbtRegression.id,
        insightId: "mainthread-work-breakdown",
        title: "Main thread work",
        description: "Main thread work breakdown",
        score: 0.5,
        sources: [
          {
            group: "scriptEvaluation",
            groupLabel: "Script Evaluation",
            duration: 1800,
          },
          { group: "styleLayout", groupLabel: "Style & Layout", duration: 800 },
          {
            group: "paintCompositeRender",
            groupLabel: "Rendering",
            duration: 600,
          },
        ],
      },
    ],
  });

  const tbtRun = await prisma.run.findUnique({
    where: { id: tbtRegression.id },
    include: { monitor: true },
  });

  if (tbtRun) {
    const regressions = await detectRegressions(tbtRun as any, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        tbtRun as any,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(tbtRun as any, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as any,
          diffSummary: diffSummary as any,
        },
      });

      console.log(
        `   ✅ ${regression.metricName.toUpperCase()}: ${regression.severity} (${regression.confidence} confidence)`,
      );
      if (causes.length > 0) {
        console.log(
          `      Top cause: ${causes[0].title} (${causes[0].confidence}% confidence)`,
        );
      }
    }
  }
  console.log();

  // Regression 3: CLS regression (layout shifts)
  console.log("Creating Regression 3: CLS regression...");
  const clsRegression = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: "success",
      queuedAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(Date.now() + 10000),

      performanceScore: 78,
      accessibilityScore: 95,
      bestPracticesScore: 88,
      seoScore: 92,

      lcp: 2100,
      inp: 200,
      tbt: 280,
      cls: 0.18, // +100% from baseline (~0.09) - CRITICAL
      fcp: 1600,
      ttfb: 550,

      speedIndex: 3300,
      tti: 3900,
      totalByteWeight: 1050000,
      numRequests: 55,
      mainThreadWork: 2200,
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        runId: clsRegression.id,
        insightId: "layout-shift-elements",
        title: "Layout shift elements",
        description: "Elements causing layout shifts",
        score: 0.3,
        sources: [
          { node: '{"selector": "div.ad-banner"}', score: 0.08 }, // New shift source
          { node: '{"selector": "img.lazy-loaded"}', score: 0.05 },
          { node: '{"selector": "div.dynamic-content"}', score: 0.05 },
        ],
      },
    ],
  });

  const clsRun = await prisma.run.findUnique({
    where: { id: clsRegression.id },
    include: { monitor: true },
  });

  if (clsRun) {
    const regressions = await detectRegressions(clsRun as any, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        clsRun as any,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(clsRun as any, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as any,
          diffSummary: diffSummary as any,
        },
      });

      console.log(
        `   ✅ ${regression.metricName.toUpperCase()}: ${regression.severity} (${regression.confidence} confidence)`,
      );
      if (causes.length > 0) {
        console.log(
          `      Top cause: ${causes[0].title} (${causes[0].confidence}% confidence)`,
        );
      }
    }
  }
  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("✅ Seed completed successfully!\n");
  console.log("Test data created:");
  console.log(`   - User: ${user.email}`);
  console.log(`   - Site: ${site.name}`);
  console.log(`   - Monitor: ${monitor.id}`);
  console.log(`   - Baseline runs: 30`);
  console.log(`   - Regressed runs: 3`);
  console.log(`   - Regression alerts: Check database\n`);

  const alerts = await prisma.regressionAlert.findMany({
    where: { run: { monitorId: monitor.id } },
  });
  console.log(`Total regression alerts created: ${alerts.length}`);
  console.log("\nTo view in UI:");
  console.log(`   1. Sign in as: ${user.email}`);
  console.log(`   2. Navigate to site: ${site.name}`);
  console.log(`   3. Click on any of the last 3 runs to see regressions\n`);
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
