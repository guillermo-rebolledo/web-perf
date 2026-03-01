/**
 * Seed script — gradual performance improvement over time.
 *
 * Creates one mobile and one desktop monitor under the same site. Both sets of
 * runs start poorly and steadily recover across the requested time window, so
 * the Run History chart shows a clear upward trend. Desktop values start less
 * severely degraded and reach a higher ceiling, reflecting the absence of
 * mobile CPU and network throttling in Lighthouse.
 *
 * Usage:
 *   pnpm seed:improvement <email> [name] [numRuns] [days]
 *
 * Arguments:
 *   email    - User email address (required)
 *   name     - User display name (optional, defaults to "Test User")
 *   numRuns  - Runs per monitor (optional, default 30; total = numRuns × 2)
 *   days     - Time window to spread runs across (optional, default 30)
 *
 * Examples:
 *   pnpm seed:improvement user@example.com
 *   pnpm seed:improvement user@example.com "Jane Doe" 60 30
 *
 * Creates:
 *   - Test user / site / 2 monitors (upserted — safe to re-run)
 *   - numRuns successful runs per monitor spread evenly across the last `days`
 *     days, with metrics interpolated from poor → good
 */

import { PrismaClient, RunStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const userEmail = args[0];
const userName = args[1] ?? "Test User";
const numRuns = args[2] ? parseInt(args[2], 10) : 30;
const windowDays = args[3] ? parseInt(args[3], 10) : 30;

if (!userEmail) {
  console.error("❌ Error: Email argument is required\n");
  console.log("Usage:");
  console.log("  pnpm seed:improvement <email> [name] [numRuns] [days]\n");
  console.log("Examples:");
  console.log("  pnpm seed:improvement user@example.com");
  console.log('  pnpm seed:improvement user@example.com "Jane Doe" 60 30\n');
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
  console.error(`❌ Error: Invalid email format: ${userEmail}\n`);
  process.exit(1);
}

if (isNaN(numRuns) || numRuns < 2 || numRuns > 500) {
  console.error("❌ Error: numRuns must be between 2 and 500\n");
  process.exit(1);
}

if (isNaN(windowDays) || windowDays < 1 || windowDays > 365) {
  console.error("❌ Error: days must be between 1 and 365\n");
  process.exit(1);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetricBounds {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  lcp: number;
  fcp: number;
  ttfb: number;
  cls: number;
  inp: number;
  tbt: number;
  speedIndex: number;
  tti: number;
  totalByteWeight: number;
  numRequests: number;
  mainThreadWork: number;
}

// ── Metric boundaries ─────────────────────────────────────────────────────────
//
// Mobile: throttled CPU + network — lower scores, slower timings.
// Desktop: no throttling — scores ~8-12 pts higher, timings ~40-55% faster.
// A11y / BP / SEO are strategy-independent (same audit, same content).
// TTFB is server-side latency — identical across strategies.

const MOBILE_START: MetricBounds = {
  performanceScore: 41,
  accessibilityScore: 70,
  bestPracticesScore: 65,
  seoScore: 68,
  lcp: 5800,
  fcp: 4400,
  ttfb: 2800,
  cls: 0.41,
  inp: 540,
  tbt: 880,
  speedIndex: 9000,
  tti: 9800,
  totalByteWeight: 5_000_000,
  numRequests: 130,
  mainThreadWork: 6500,
};

const MOBILE_END: MetricBounds = {
  performanceScore: 93,
  accessibilityScore: 98,
  bestPracticesScore: 96,
  seoScore: 97,
  lcp: 1500,
  fcp: 1100,
  ttfb: 400,
  cls: 0.03,
  inp: 110,
  tbt: 120,
  speedIndex: 2600,
  tti: 3000,
  totalByteWeight: 850_000,
  numRequests: 42,
  mainThreadWork: 1400,
};

// Desktop starts less degraded and recovers to a higher ceiling than mobile.
const DESKTOP_START: MetricBounds = {
  performanceScore: 53,
  accessibilityScore: 70, // same audit
  bestPracticesScore: 65, // same audit
  seoScore: 68,           // same audit
  lcp: 3200,              // ~55% of mobile
  fcp: 2600,
  ttfb: 2800,             // server-side: same as mobile
  cls: 0.35,
  inp: 350,
  tbt: 400,
  speedIndex: 5500,
  tti: 6400,
  totalByteWeight: 5_000_000,
  numRequests: 130,
  mainThreadWork: 3700,
};

const DESKTOP_END: MetricBounds = {
  performanceScore: 98,
  accessibilityScore: 98, // same audit
  bestPracticesScore: 96, // same audit
  seoScore: 97,           // same audit
  lcp: 850,
  fcp: 640,
  ttfb: 400,              // server-side: same as mobile
  cls: 0.025,
  inp: 72,
  tbt: 55,
  speedIndex: 1600,
  tti: 1950,
  totalByteWeight: 850_000,
  numRequests: 42,
  mainThreadWork: 800,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Linear interpolation with ±jitter random noise. */
function lerp(start: number, end: number, t: number, jitter = 0.04): number {
  const base = start + (end - start) * t;
  const noise = (Math.random() * 2 - 1) * jitter * Math.abs(end - start);
  return Math.max(0, base + noise);
}

/** Create numRuns runs for a single monitor, interpolating from `start` to `end`. */
async function createRuns(
  monitorId: string,
  start: MetricBounds,
  end: MetricBounds,
  label: string,
): Promise<void> {
  const nowMs = Date.now();
  console.log(`\nCreating ${numRuns} ${label} runs (oldest → newest)…`);

  for (let i = 0; i < numRuns; i++) {
    // t = 0 → oldest (poor), t = 1 → newest (healthy)
    const t = numRuns === 1 ? 0 : i / (numRuns - 1);
    const progressPercent = (((i + 1) / numRuns) * 100).toFixed(0);

    const msBack = (1 - t) * windowDays * 24 * 60 * 60 * 1000;
    const queuedAt = new Date(nowMs - msBack);
    const completedAt = new Date(queuedAt.getTime() + 12_000);

    await prisma.run.create({
      data: {
        monitorId,
        status: RunStatus.success,
        queuedAt,
        startedAt: queuedAt,
        completedAt,
        lighthouseVersion: "12.0.0",
        finalUrl: "https://example.com/",

        performanceScore:   lerp(start.performanceScore,   end.performanceScore,   t),
        accessibilityScore: lerp(start.accessibilityScore, end.accessibilityScore, t),
        bestPracticesScore: lerp(start.bestPracticesScore, end.bestPracticesScore, t),
        seoScore:           lerp(start.seoScore,           end.seoScore,           t),

        lcp:            lerp(start.lcp,   end.lcp,   t),
        fcp:            lerp(start.fcp,   end.fcp,   t),
        ttfb:           lerp(start.ttfb,  end.ttfb,  t),
        cls:            lerp(start.cls,   end.cls,   t),
        inp:            lerp(start.inp,   end.inp,   t),
        tbt:            lerp(start.tbt,   end.tbt,   t),
        speedIndex:     lerp(start.speedIndex,    end.speedIndex,    t),
        tti:            lerp(start.tti,            end.tti,           t),
        totalByteWeight: Math.round(lerp(start.totalByteWeight, end.totalByteWeight, t)),
        numRequests:    Math.round(lerp(start.numRequests,    end.numRequests,    t)),
        mainThreadWork: lerp(start.mainThreadWork, end.mainThreadWork, t),
      },
    });

    process.stdout.write(`\r  [${progressPercent.padStart(3)}%] run ${i + 1}/${numRuns}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding gradual-improvement run history…\n");
  console.log(`  Runs per monitor: ${numRuns} (${numRuns * 2} total)`);
  console.log(`  Window:           last ${windowDays} days\n`);

  // 1. User
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { email: userEmail, name: userName },
  });
  console.log(`✅ User: ${user.email}`);

  // 2. Site
  const site = await prisma.site.upsert({
    where: { id: "test-site-improvement" },
    update: {},
    create: {
      id: "test-site-improvement",
      name: "Test Site (gradual improvement)",
      url: "https://example.com",
      userId: user.id,
    },
  });
  console.log(`✅ Site: ${site.name}`);

  // 3. Mobile monitor
  const mobileMonitor = await prisma.monitor.upsert({
    where: { id: "test-monitor-improvement-mobile" },
    update: {},
    create: {
      id: "test-monitor-improvement-mobile",
      siteId: site.id,
      strategy: "mobile",
      cadenceMinutes: 1440,
      isActive: true,
    },
  });
  console.log(`✅ Monitor: ${mobileMonitor.id} (mobile)`);

  // 4. Desktop monitor
  const desktopMonitor = await prisma.monitor.upsert({
    where: { id: "test-monitor-improvement-desktop" },
    update: {},
    create: {
      id: "test-monitor-improvement-desktop",
      siteId: site.id,
      strategy: "desktop",
      cadenceMinutes: 1440,
      isActive: true,
    },
  });
  console.log(`✅ Monitor: ${desktopMonitor.id} (desktop)`);

  // 5. Runs for each monitor
  await createRuns(mobileMonitor.id, MOBILE_START, MOBILE_END, "📱 mobile");
  await createRuns(desktopMonitor.id, DESKTOP_START, DESKTOP_END, "🖥️  desktop");

  console.log("\n\n" + "=".repeat(60));
  console.log("✅ Seed completed!\n");
  console.log("Test data created:");
  console.log(`  User:            ${user.email}`);
  console.log(`  Site:            ${site.name} (${site.id})`);
  console.log(`  Mobile monitor:  ${mobileMonitor.id}`);
  console.log(`  Desktop monitor: ${desktopMonitor.id}`);
  console.log(`  Runs per monitor: ${numRuns} (last ${windowDays} days)`);
  console.log(`  Mobile trend:    Perf ${MOBILE_START.performanceScore} → ${MOBILE_END.performanceScore}  |  LCP ${MOBILE_START.lcp}ms → ${MOBILE_END.lcp}ms`);
  console.log(`  Desktop trend:   Perf ${DESKTOP_START.performanceScore} → ${DESKTOP_END.performanceScore}  |  LCP ${DESKTOP_START.lcp}ms → ${DESKTOP_END.lcp}ms\n`);
  console.log("To view in the UI:");
  console.log(`  1. Sign in as: ${user.email}`);
  console.log(`  2. Navigate to "Run History" in the sidebar`);
  console.log(`  3. Select "Test Site (gradual improvement)"`);
  console.log(`  4. Switch between 📱 mobile and 🖥️ desktop monitors to compare\n`);
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
