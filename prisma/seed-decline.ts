/**
 * Seed script — gradual performance decline over time.
 *
 * Creates one mobile and one desktop monitor under the same site. Both sets of
 * runs start healthy and steadily worsen across the requested time window, so
 * the Run History chart shows a clear downward trend. Desktop values start
 * higher and degrade less severely, reflecting the absence of mobile CPU and
 * network throttling in Lighthouse.
 *
 * Usage:
 *   pnpm seed:decline <email> [name] [numRuns] [days]
 *
 * Arguments:
 *   email    - User email address (required)
 *   name     - User display name (optional, defaults to "Test User")
 *   numRuns  - Runs per monitor (optional, default 30; total = numRuns × 2)
 *   days     - Time window to spread runs across (optional, default 30)
 *
 * Examples:
 *   pnpm seed:decline user@example.com
 *   pnpm seed:decline user@example.com "Jane Doe" 60 30
 *
 * Creates:
 *   - Test user / site / 2 monitors (upserted — safe to re-run)
 *   - numRuns successful runs per monitor spread evenly across the last `days`
 *     days, with metrics interpolated from good → poor
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
  console.log("  pnpm seed:decline <email> [name] [numRuns] [days]\n");
  console.log("Examples:");
  console.log("  pnpm seed:decline user@example.com");
  console.log('  pnpm seed:decline user@example.com "Jane Doe" 60 30\n');
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
  performanceScore: 91,
  accessibilityScore: 97,
  bestPracticesScore: 95,
  seoScore: 96,
  lcp: 1600,
  fcp: 1200,
  ttfb: 450,
  cls: 0.04,
  inp: 130,
  tbt: 140,
  speedIndex: 2800,
  tti: 3200,
  totalByteWeight: 900_000,
  numRequests: 45,
  mainThreadWork: 1600,
};

const MOBILE_END: MetricBounds = {
  performanceScore: 42,
  accessibilityScore: 71,
  bestPracticesScore: 67,
  seoScore: 69,
  lcp: 5500,
  fcp: 4200,
  ttfb: 2600,
  cls: 0.38,
  inp: 520,
  tbt: 850,
  speedIndex: 8500,
  tti: 9200,
  totalByteWeight: 4_800_000,
  numRequests: 120,
  mainThreadWork: 6200,
};

// Desktop starts higher and degrades less severely than mobile.
const DESKTOP_START: MetricBounds = {
  performanceScore: 97,
  accessibilityScore: 97, // same audit
  bestPracticesScore: 95, // same audit
  seoScore: 96,           // same audit
  lcp: 900,               // ~55% of mobile
  fcp: 700,
  ttfb: 450,              // server-side: same as mobile
  cls: 0.035,             // slightly better layout stability
  inp: 85,                // much faster without throttling
  tbt: 65,                // significantly less blocking time
  speedIndex: 1700,
  tti: 2100,
  totalByteWeight: 900_000,
  numRequests: 45,
  mainThreadWork: 900,
};

const DESKTOP_END: MetricBounds = {
  performanceScore: 55,
  accessibilityScore: 71, // same audit
  bestPracticesScore: 67, // same audit
  seoScore: 69,           // same audit
  lcp: 3100,
  fcp: 2400,
  ttfb: 2600,             // server-side: same as mobile
  cls: 0.32,
  inp: 340,
  tbt: 390,
  speedIndex: 5200,
  tti: 6000,
  totalByteWeight: 4_800_000,
  numRequests: 120,
  mainThreadWork: 3500,
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
    // t = 0 → oldest (healthy), t = 1 → newest (degraded)
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
  console.log("🌱 Seeding gradual-decline run history…\n");
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
    where: { id: "test-site-decline" },
    update: {},
    create: {
      id: "test-site-decline",
      name: "Test Site (gradual decline)",
      url: "https://example.com",
      userId: user.id,
    },
  });
  console.log(`✅ Site: ${site.name}`);

  // 3. Mobile monitor
  const mobileMonitor = await prisma.monitor.upsert({
    where: { id: "test-monitor-decline-mobile" },
    update: {},
    create: {
      id: "test-monitor-decline-mobile",
      siteId: site.id,
      strategy: "mobile",
      cadenceMinutes: 1440,
      isActive: true,
    },
  });
  console.log(`✅ Monitor: ${mobileMonitor.id} (mobile)`);

  // 4. Desktop monitor
  const desktopMonitor = await prisma.monitor.upsert({
    where: { id: "test-monitor-decline-desktop" },
    update: {},
    create: {
      id: "test-monitor-decline-desktop",
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
  console.log(`  3. Select "Test Site (gradual decline)"`);
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
