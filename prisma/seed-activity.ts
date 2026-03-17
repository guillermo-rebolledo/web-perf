/**
 * Seed script to create mock activity events for testing
 *
 * Usage:
 *   pnpm seed:activity <email> [numEvents]
 *
 * Arguments:
 *   email     - User email address (required)
 *   numEvents - Number of activity events to create (optional, defaults to 50)
 *
 * Examples:
 *   pnpm seed:activity user@example.com
 *   pnpm seed:activity user@example.com 100
 *
 * Creates:
 * - A spread of all 6 event types across the last 30 days
 * - Realistic metadata for each event type
 */

import { PrismaClient } from "@prisma/client";
import type { ActivityEventType, ActivityEventMetadata } from "../src/lib/activity";
import { ENTITY_TYPE_MAP } from "../src/lib/activity";

const prisma = new PrismaClient();

// ── Fake site/monitor data ────────────────────────────────────────────────────

const FAKE_SITES = [
  { name: "Marketing Site", url: "https://acme.com", id: "seed-site-marketing" },
  { name: "Docs Portal", url: "https://docs.acme.com", id: "seed-site-docs" },
  { name: "E-commerce Store", url: "https://shop.acme.com", id: "seed-site-shop" },
  { name: "Blog", url: "https://blog.acme.com", id: "seed-site-blog" },
];

const FAKE_MONITORS = [
  { id: "seed-monitor-1", siteIndex: 0, strategy: "mobile", triggerType: "schedule" },
  { id: "seed-monitor-2", siteIndex: 0, strategy: "desktop", triggerType: "deployment" },
  { id: "seed-monitor-3", siteIndex: 1, strategy: "mobile", triggerType: "schedule" },
  { id: "seed-monitor-4", siteIndex: 2, strategy: "mobile", triggerType: "deployment" },
  { id: "seed-monitor-5", siteIndex: 3, strategy: "desktop", triggerType: "schedule" },
];

const GITHUB_REPOS = [
  "acme/marketing-site",
  "acme/ecommerce",
  "acme/docs",
];

const GITHUB_BRANCHES = ["main", "production", "stable"];

const ERROR_MESSAGES = [
  "PSI API timeout after 30s",
  "Network error: ECONNRESET",
  "Invalid URL scheme — must be http or https",
  "PSI quota exceeded for today",
  "Target page returned HTTP 503",
];

const SEVERITIES = ["critical", "high", "medium", "low"] as const;

// ── Metadata factories ────────────────────────────────────────────────────────

function makeSiteCreatedMeta(siteIdx: number): ActivityEventMetadata {
  const site = FAKE_SITES[siteIdx % FAKE_SITES.length];
  return { type: "site_created", siteName: site.name, siteUrl: site.url };
}

function makeMonitorCreatedMeta(monitorIdx: number): ActivityEventMetadata {
  const m = FAKE_MONITORS[monitorIdx % FAKE_MONITORS.length];
  const site = FAKE_SITES[m.siteIndex];
  return {
    type: "monitor_created",
    siteName: site.name,
    siteUrl: site.url,
    siteId: site.id,
    strategy: m.strategy,
    triggerType: m.triggerType,
  };
}

function makeRunCompletedMeta(monitorIdx: number, score: number): ActivityEventMetadata {
  const m = FAKE_MONITORS[monitorIdx % FAKE_MONITORS.length];
  const site = FAKE_SITES[m.siteIndex];
  return {
    type: "run_completed",
    siteName: site.name,
    siteUrl: site.url,
    siteId: site.id,
    monitorId: m.id,
    performanceScore: score,
  };
}

function makeRunFailedMeta(monitorIdx: number, errorIdx: number): ActivityEventMetadata {
  const m = FAKE_MONITORS[monitorIdx % FAKE_MONITORS.length];
  const site = FAKE_SITES[m.siteIndex];
  return {
    type: "run_failed",
    siteName: site.name,
    siteUrl: site.url,
    siteId: site.id,
    monitorId: m.id,
    errorMessage: ERROR_MESSAGES[errorIdx % ERROR_MESSAGES.length],
  };
}

function makeRegressionMeta(monitorIdx: number, alertCount: number, sevIdxStart: number): ActivityEventMetadata {
  const m = FAKE_MONITORS[monitorIdx % FAKE_MONITORS.length];
  const site = FAKE_SITES[m.siteIndex];
  const severities = Array.from({ length: alertCount }, (_, i) =>
    SEVERITIES[(sevIdxStart + i) % SEVERITIES.length],
  );
  return {
    type: "regression_detected",
    siteName: site.name,
    siteUrl: site.url,
    siteId: site.id,
    alertCount,
    severities,
  };
}

function makeDeploymentMeta(monitorIdx: number): ActivityEventMetadata {
  const m = FAKE_MONITORS[monitorIdx % FAKE_MONITORS.length];
  const site = FAKE_SITES[m.siteIndex];
  return {
    type: "deployment_run_triggered",
    siteName: site.name,
    siteUrl: site.url,
    siteId: site.id,
    monitorId: m.id,
    githubRepo: GITHUB_REPOS[monitorIdx % GITHUB_REPOS.length],
    githubBranch: GITHUB_BRANCHES[monitorIdx % GITHUB_BRANCHES.length],
  };
}

// Pick a random entity ID (just a plausible cuid-style string)
function fakeEntityId(i: number) {
  return `seed-entity-${i.toString().padStart(4, "0")}`;
}

// Spread events evenly across the last `daySpread` days
function eventDate(index: number, total: number, daySpread = 30): Date {
  const daysBack = ((total - 1 - index) / (total - 1)) * daySpread;
  const jitter = (Math.random() - 0.5) * 60 * 60 * 1000; // ±30 min
  return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000 + jitter);
}

// Cycle through event types with a realistic distribution
const EVENT_TYPE_WEIGHTS: { type: ActivityEventType; weight: number }[] = [
  { type: "run_completed", weight: 40 },
  { type: "regression_detected", weight: 20 },
  { type: "run_failed", weight: 15 },
  { type: "deployment_run_triggered", weight: 12 },
  { type: "monitor_created", weight: 8 },
  { type: "site_created", weight: 5 },
];

const TOTAL_WEIGHT = EVENT_TYPE_WEIGHTS.reduce((s, e) => s + e.weight, 0);

function pickEventType(index: number): ActivityEventType {
  // Deterministic weighted pick so distribution is predictable
  const slot = index % TOTAL_WEIGHT;
  let acc = 0;
  for (const { type, weight } of EVENT_TYPE_WEIGHTS) {
    acc += weight;
    if (slot < acc) return type;
  }
  return "run_completed";
}

function buildMetadata(type: ActivityEventType, i: number): ActivityEventMetadata {
  switch (type) {
    case "site_created":
      return makeSiteCreatedMeta(i);
    case "monitor_created":
      return makeMonitorCreatedMeta(i);
    case "run_completed":
      return makeRunCompletedMeta(i, Math.round(55 + Math.random() * 40));
    case "run_failed":
      return makeRunFailedMeta(i, i);
    case "regression_detected":
      return makeRegressionMeta(i, 1 + (i % 3), i);
    case "deployment_run_triggered":
      return makeDeploymentMeta(i);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const userEmail = args[0];
const numEventsArg = args[1];
const numEvents = numEventsArg ? parseInt(numEventsArg, 10) : 50;

if (!userEmail) {
  console.error("❌ Error: Email argument is required\n");
  console.log("Usage:");
  console.log("  pnpm seed:activity <email> [numEvents]\n");
  console.log("Examples:");
  console.log("  pnpm seed:activity user@example.com");
  console.log("  pnpm seed:activity user@example.com 100\n");
  process.exit(1);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(userEmail)) {
  console.error(`❌ Error: Invalid email format: ${userEmail}\n`);
  process.exit(1);
}

if (isNaN(numEvents) || numEvents < 1 || numEvents > 1000) {
  console.error(
    `❌ Error: numEvents must be a number between 1 and 1000 (got: ${numEventsArg})\n`,
  );
  process.exit(1);
}

async function main() {
  console.log("🌱 Seeding activity events...\n");
  console.log(`Target events: ${numEvents}\n`);

  // Resolve user
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { email: userEmail, name: "Test User" },
  });
  console.log(`✅ User: ${user.email}\n`);

  // Create events in batches of 10 to avoid long serial waits
  const BATCH = 10;
  let created = 0;

  for (let i = 0; i < numEvents; i += BATCH) {
    const batchSize = Math.min(BATCH, numEvents - i);
    await Promise.all(
      Array.from({ length: batchSize }, (_, j) => {
        const idx = i + j;
        const type = pickEventType(idx);
        const metadata = buildMetadata(type, idx);
        const createdAt = eventDate(idx, numEvents);
        return prisma.activityEvent.create({
          data: {
            userId: user.id,
            type,
            entityId: fakeEntityId(idx),
            entityType: ENTITY_TYPE_MAP[type],
            metadata: metadata as object,
            createdAt,
          },
        });
      }),
    );
    created += batchSize;
    const pct = ((created / numEvents) * 100).toFixed(0);
    console.log(`[${pct}%] Created ${created}/${numEvents} events...`);
  }

  // Summary
  const counts = await prisma.activityEvent.groupBy({
    by: ["type"],
    where: { userId: user.id },
    _count: { type: true },
    orderBy: { _count: { type: "desc" } },
  });

  console.log("\n" + "=".repeat(50));
  console.log("✅ Seed complete!\n");
  console.log("Events by type:");
  for (const row of counts) {
    console.log(`   - ${row.type}: ${row._count.type}`);
  }
  console.log("\nTo view: open the Activity sheet in the header (or /activity).");
  console.log("=".repeat(50));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
