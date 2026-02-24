/**
 * Seed script to create test data with regression detection
 *
 * Usage:
 *   pnpm tsx prisma/seed-regressions.ts <email> [name]
 *
 * Arguments:
 *   email - User email address (required)
 *   name  - User display name (optional, defaults to "Test User")
 *
 * Examples:
 *   pnpm tsx prisma/seed-regressions.ts user@example.com
 *   pnpm tsx prisma/seed-regressions.ts user@example.com "John Doe"
 *
 * Creates:
 * - Test user with provided email
 * - Test site
 * - Test monitor
 * - 30 baseline runs (stable metrics)
 * - 6 regressed runs distributed across time periods
 * - Calculates baselines
 * - Detects regressions
 */

import { PrismaClient } from "@prisma/client";
import { calculateBaselines } from "../src/lib/regression/baseline-calculator";
import { detectRegressions } from "../src/lib/regression/detector";
import { analyzeRootCauses } from "../src/lib/regression/rules-engine";
import { calculateDiffSummary } from "../src/lib/regression/diff-engine";

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const userEmail = args[0];
const userName = args[1] || "Test User";

// Validate email argument
if (!userEmail) {
  console.error("❌ Error: Email argument is required\n");
  console.log("Usage:");
  console.log("  pnpm tsx prisma/seed-regressions.ts <email> [name]\n");
  console.log("Examples:");
  console.log('  pnpm tsx prisma/seed-regressions.ts user@example.com');
  console.log('  pnpm tsx prisma/seed-regressions.ts user@example.com "John Doe"\n');
  process.exit(1);
}

// Basic email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(userEmail)) {
  console.error(`❌ Error: Invalid email format: ${userEmail}\n`);
  process.exit(1);
}

async function main() {
  console.log("🌱 Seeding regression test data...\n");

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
    const regressions = await detectRegressions(lcpRun, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        lcpRun,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(lcpRun, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as unknown as import("@prisma/client").Prisma.InputJsonValue,
          diffSummary: diffSummary as unknown as import("@prisma/client").Prisma.InputJsonValue,
          createdAt: lcpRun.completedAt || new Date(),
          updatedAt: lcpRun.completedAt || new Date(),
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
    const regressions = await detectRegressions(tbtRun, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        tbtRun,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(tbtRun, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as unknown as import("@prisma/client").Prisma.InputJsonValue,
          diffSummary: diffSummary as unknown as import("@prisma/client").Prisma.InputJsonValue,
          createdAt: tbtRun.completedAt || new Date(),
          updatedAt: tbtRun.completedAt || new Date(),
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
    const regressions = await detectRegressions(clsRun, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        clsRun,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(clsRun, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as unknown as import("@prisma/client").Prisma.InputJsonValue,
          diffSummary: diffSummary as unknown as import("@prisma/client").Prisma.InputJsonValue,
          createdAt: clsRun.completedAt || new Date(),
          updatedAt: clsRun.completedAt || new Date(),
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

  // Regression 4: FCP regression (2 days ago - image optimization issue)
  console.log("Creating Regression 4: FCP regression (2 days ago)...");
  const fcpRegression = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: "success",
      queuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10000),

      performanceScore: 80,
      accessibilityScore: 95,
      bestPracticesScore: 90,
      seoScore: 92,

      lcp: 2200,
      inp: 200,
      tbt: 280,
      cls: 0.09,
      fcp: 2100, // +40% from baseline (~1500ms) - MODERATE
      ttfb: 550,

      speedIndex: 3300,
      tti: 3800,
      totalByteWeight: 1350000, // +350KB
      numRequests: 58,
      mainThreadWork: 2300,
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        runId: fcpRegression.id,
        insightId: "offscreen-images",
        title: "Defer offscreen images",
        description: "Consider lazy-loading offscreen images",
        score: 0.6,
        sources: [
          { url: "https://example.com/hero.jpg", wastedMs: 180 },
          { url: "https://example.com/banner.jpg", wastedMs: 120 },
        ],
      },
      {
        runId: fcpRegression.id,
        insightId: "uses-optimized-images",
        title: "Optimize images",
        description: "Images not properly sized or compressed",
        score: 0.55,
        sources: [
          {
            url: "https://example.com/hero.jpg",
            wastedBytes: 250000,
            totalBytes: 450000,
          },
        ],
      },
    ],
  });

  const fcpRun = await prisma.run.findUnique({
    where: { id: fcpRegression.id },
    include: { monitor: true },
  });

  if (fcpRun) {
    const regressions = await detectRegressions(fcpRun, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        fcpRun,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(fcpRun, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as unknown as import("@prisma/client").Prisma.InputJsonValue,
          diffSummary: diffSummary as unknown as import("@prisma/client").Prisma.InputJsonValue,
          createdAt: fcpRun.completedAt || new Date(),
          updatedAt: fcpRun.completedAt || new Date(),
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

  // Regression 5: Speed Index regression (3 days ago - rendering delay)
  console.log("Creating Regression 5: Speed Index regression (3 days ago)...");
  const siRegression = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: "success",
      queuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 10000),

      performanceScore: 77,
      accessibilityScore: 95,
      bestPracticesScore: 88,
      seoScore: 92,

      lcp: 2250,
      inp: 210,
      tbt: 300,
      cls: 0.09,
      fcp: 1650,
      ttfb: 550,

      speedIndex: 4100, // +37% from baseline (~3000ms) - MODERATE
      tti: 3900,
      totalByteWeight: 1200000,
      numRequests: 62,
      mainThreadWork: 2500,
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        runId: siRegression.id,
        insightId: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        description: "Resources blocking first paint",
        score: 0.55,
        sources: [
          { url: "https://example.com/styles.css", wastedMs: 280 },
          { url: "https://example.com/fonts.css", wastedMs: 150 },
        ],
      },
      {
        runId: siRegression.id,
        insightId: "unminified-css",
        title: "Minify CSS",
        description: "CSS files not minified",
        score: 0.7,
        sources: [
          { url: "https://example.com/main.css", wastedBytes: 45000 },
        ],
      },
    ],
  });

  const siRun = await prisma.run.findUnique({
    where: { id: siRegression.id },
    include: { monitor: true },
  });

  if (siRun) {
    const regressions = await detectRegressions(siRun, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        siRun,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(siRun, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as unknown as import("@prisma/client").Prisma.InputJsonValue,
          diffSummary: diffSummary as unknown as import("@prisma/client").Prisma.InputJsonValue,
          createdAt: siRun.completedAt || new Date(),
          updatedAt: siRun.completedAt || new Date(),
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

  // Regression 6: TTFB/FCP regression (5 days ago - backend slowdown)
  console.log("Creating Regression 6: TTFB regression (5 days ago)...");
  const ttfbRegression = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: "success",
      queuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10000),

      performanceScore: 72,
      accessibilityScore: 95,
      bestPracticesScore: 88,
      seoScore: 92,

      lcp: 2300,
      inp: 200,
      tbt: 280,
      cls: 0.09,
      fcp: 2100, // +40% from baseline (~1500ms) - MODERATE
      ttfb: 900, // +80% from baseline (~500ms) - CRITICAL

      speedIndex: 3500,
      tti: 4100,
      totalByteWeight: 1050000,
      numRequests: 55,
      mainThreadWork: 2200,
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        runId: ttfbRegression.id,
        insightId: "server-response-time",
        title: "Server response time",
        description: "Reduce server response time",
        score: 0.4,
        sources: [
          { url: "https://example.com", responseTime: 900 },
        ],
      },
      {
        runId: ttfbRegression.id,
        insightId: "network-server-latency",
        title: "Network server latency",
        description: "High server latency detected",
        score: 0.5,
        sources: [
          { url: "https://example.com/api/data", serverLatency: 400 },
        ],
      },
    ],
  });

  const ttfbRun = await prisma.run.findUnique({
    where: { id: ttfbRegression.id },
    include: { monitor: true },
  });

  if (ttfbRun) {
    const regressions = await detectRegressions(ttfbRun, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        ttfbRun,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(ttfbRun, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as unknown as import("@prisma/client").Prisma.InputJsonValue,
          diffSummary: diffSummary as unknown as import("@prisma/client").Prisma.InputJsonValue,
          createdAt: ttfbRun.completedAt || new Date(),
          updatedAt: ttfbRun.completedAt || new Date(),
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

  // Regression 7: INP regression (10 days ago - interaction delay)
  console.log("Creating Regression 7: INP regression (10 days ago)...");
  const inpRegression = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: "success",
      queuedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 10000),

      performanceScore: 76,
      accessibilityScore: 95,
      bestPracticesScore: 88,
      seoScore: 92,

      lcp: 2150,
      inp: 350, // +94% from baseline (~180ms) - CRITICAL
      tbt: 290,
      cls: 0.09,
      fcp: 1600,
      ttfb: 550,

      speedIndex: 3400,
      tti: 3950,
      totalByteWeight: 1150000,
      numRequests: 58,
      mainThreadWork: 2600,
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        runId: inpRegression.id,
        insightId: "long-tasks",
        title: "Long tasks",
        description: "Avoid long main-thread tasks",
        score: 0.5,
        sources: [
          { url: "https://example.com/event-handlers.js", duration: 280 },
          { url: "https://example.com/app.js", duration: 220 },
        ],
      },
      {
        runId: inpRegression.id,
        insightId: "bootup-time",
        title: "JavaScript execution time",
        description: "Reduce JavaScript execution time",
        score: 0.65,
        sources: [
          { url: "https://example.com/event-handlers.js", wastedMs: 380 },
          { url: "https://example.com/app.js", wastedMs: 250 },
        ],
      },
    ],
  });

  const inpRun = await prisma.run.findUnique({
    where: { id: inpRegression.id },
    include: { monitor: true },
  });

  if (inpRun) {
    const regressions = await detectRegressions(inpRun, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        inpRun,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(inpRun, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as unknown as import("@prisma/client").Prisma.InputJsonValue,
          diffSummary: diffSummary as unknown as import("@prisma/client").Prisma.InputJsonValue,
          createdAt: inpRun.completedAt || new Date(),
          updatedAt: inpRun.completedAt || new Date(),
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

  // Regression 8: Multi-metric regression (30 days ago - severe deployment issue)
  console.log(
    "Creating Regression 8: Multi-metric regression (30 days ago)...",
  );
  const multiRegression = await prisma.run.create({
    data: {
      monitorId: monitor.id,
      status: "success",
      queuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 10000),

      performanceScore: 65,
      accessibilityScore: 95,
      bestPracticesScore: 85,
      seoScore: 90,

      lcp: 3500, // +67% from baseline - CRITICAL
      inp: 280,
      tbt: 420, // +68% from baseline - CRITICAL
      cls: 0.15, // +67% from baseline - CRITICAL
      fcp: 2000,
      ttfb: 750,

      speedIndex: 4200,
      tti: 4800,
      totalByteWeight: 1800000, // +800KB
      numRequests: 75, // +25 requests
      mainThreadWork: 3500, // +1500ms
    },
  });

  await prisma.insight.createMany({
    data: [
      {
        runId: multiRegression.id,
        insightId: "bootup-time",
        title: "JavaScript execution time",
        description: "Reduce JavaScript execution time",
        score: 0.45,
        sources: [
          { url: "https://example.com/bundle.js", wastedMs: 650 },
          { url: "https://example.com/vendor.js", wastedMs: 450 },
          { url: "https://cdn.newframework.com/core.js", wastedMs: 520 },
        ],
      },
      {
        runId: multiRegression.id,
        insightId: "third-party-summary",
        title: "Third-party code",
        description: "Third-party scripts blocking the main thread",
        score: 0.4,
        sources: [
          {
            url: "https://cdn.newframework.com",
            blockingTime: 520,
            transferSize: 380000,
          },
        ],
      },
      {
        runId: multiRegression.id,
        insightId: "layout-shift-elements",
        title: "Layout shift elements",
        description: "Elements causing layout shifts",
        score: 0.35,
        sources: [
          { node: '{"selector": "div.banner"}', score: 0.06 },
          { node: '{"selector": "img.hero"}', score: 0.05 },
          { node: '{"selector": "div.widget"}', score: 0.04 },
        ],
      },
      {
        runId: multiRegression.id,
        insightId: "network-requests",
        title: "Network requests",
        description: "Minimize network requests",
        score: 0.65,
        sources: Array.from({ length: 75 }, (_, idx) => ({
          url:
            idx >= 70
              ? `https://cdn.newframework.com/module${idx}.js`
              : `https://example.com/resource${idx}.js`,
          transferSize:
            idx >= 70 ? 50000 + Math.random() * 30000 : 10000 + Math.random() * 50000,
          resourceType:
            idx % 3 === 0 ? "script" : idx % 3 === 1 ? "stylesheet" : "image",
        })),
      },
    ],
  });

  const multiRun = await prisma.run.findUnique({
    where: { id: multiRegression.id },
    include: { monitor: true },
  });

  if (multiRun) {
    const regressions = await detectRegressions(multiRun, prisma);
    console.log(`   Detected ${regressions.length} regression(s)`);

    for (const regression of regressions) {
      const causes = await analyzeRootCauses(
        regression.metricName,
        multiRun,
        prisma,
      );
      const diffSummary = await calculateDiffSummary(multiRun, prisma);

      await prisma.regressionAlert.create({
        data: {
          ...regression,
          likelyCauses: causes as unknown as import("@prisma/client").Prisma.InputJsonValue,
          diffSummary: diffSummary as unknown as import("@prisma/client").Prisma.InputJsonValue,
          createdAt: multiRun.completedAt || new Date(),
          updatedAt: multiRun.completedAt || new Date(),
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
  console.log(`   - Regressed runs: 8`);
  console.log(`   - Regression alerts: Check database\n`);

  const alerts = await prisma.regressionAlert.findMany({
    where: { run: { monitorId: monitor.id } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Total regression alerts created: ${alerts.length}`);

  // Group alerts by time period
  const now = Date.now();
  const alertsByPeriod = {
    "1d": alerts.filter((a) => now - a.createdAt.getTime() <= 1 * 24 * 60 * 60 * 1000).length,
    "3d": alerts.filter((a) => now - a.createdAt.getTime() <= 3 * 24 * 60 * 60 * 1000).length,
    "5d": alerts.filter((a) => now - a.createdAt.getTime() <= 5 * 24 * 60 * 60 * 1000).length,
    "10d": alerts.filter((a) => now - a.createdAt.getTime() <= 10 * 24 * 60 * 60 * 1000).length,
    "30d": alerts.filter((a) => now - a.createdAt.getTime() <= 30 * 24 * 60 * 60 * 1000).length,
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
