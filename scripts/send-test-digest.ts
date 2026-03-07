#!/usr/bin/env tsx
/**
 * Send a test weekly digest email for debugging.
 *
 * Usage:
 *   pnpm digest:test-email <email>              # fixture data → target email
 *   pnpm digest:test-email <email> --real       # real DB data for first opted-in user
 *   pnpm digest:test-email <email> --user <id>  # real DB data for a specific user ID
 *
 * Examples:
 *   pnpm digest:test-email you@example.com
 *   pnpm digest:test-email you@example.com --real
 *   pnpm digest:test-email you@example.com --user clxyz123
 */

import "dotenv/config";
import { subDays } from "date-fns";
import type { UserDigestData } from "../src/lib/digest/aggregator.js";

// ── Arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const targetEmail = args[0];

if (!targetEmail || targetEmail.startsWith("--")) {
  console.error(
    "Usage: pnpm digest:test-email <email> [--real] [--user <userId>]",
  );
  process.exit(1);
}

const useReal = args.includes("--real");
const userIdIdx = args.indexOf("--user");
const specificUserId = userIdIdx !== -1 ? args[userIdIdx + 1] : null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function printSection(title: string) {
  console.log();
  console.log("─".repeat(60));
  console.log(` ${title}`);
  console.log("─".repeat(60));
}

// ── Fixture data (no DB required) ────────────────────────────────────────────

function makeFixtureData(email: string): UserDigestData {
  const now = new Date();
  return {
    user: { id: "fixture-user", email, name: "Test User" },
    weekRange: { start: subDays(now, 7), end: now },
    sites: [
      {
        site: { id: "site-1", name: "Marketing Site", url: "https://acme.com" },
        monitorId: "mon-1",
        strategy: "mobile",
        thisWeek: {
          avgPerformanceScore: 68,
          avgAccessibilityScore: 87,
          avgSeoScore: 92,
          avgBestPracticesScore: 78,
          avgLcp: 3200,
          avgCls: 0.12,
          avgInp: 210,
          runCount: 7,
        },
        lastWeek: {
          avgPerformanceScore: 81,
          avgAccessibilityScore: 90,
          avgSeoScore: 94,
          avgBestPracticesScore: 82,
          avgLcp: 2400,
          avgCls: 0.06,
          avgInp: 150,
          runCount: 7,
        },
        trend: "declining",
        openAlerts: { critical: 2, moderate: 3, minor: 1 },
        topRegressions: [
          {
            metricName: "lcp",
            severity: "critical",
            percentChange: 33,
            siteName: "Marketing Site",
            siteUrl: "https://acme.com",
          },
          {
            metricName: "cls",
            severity: "critical",
            percentChange: 100,
            siteName: "Marketing Site",
            siteUrl: "https://acme.com",
          },
          {
            metricName: "tbt",
            severity: "moderate",
            percentChange: 22,
            siteName: "Marketing Site",
            siteUrl: "https://acme.com",
          },
        ],
      },
      {
        site: { id: "site-2", name: "Docs", url: "https://docs.acme.com" },
        monitorId: "mon-2",
        strategy: "desktop",
        thisWeek: {
          avgPerformanceScore: 94,
          avgAccessibilityScore: 98,
          avgSeoScore: 97,
          avgBestPracticesScore: 95,
          avgLcp: 1100,
          avgCls: 0.01,
          avgInp: 80,
          runCount: 5,
        },
        lastWeek: {
          avgPerformanceScore: 89,
          avgAccessibilityScore: 96,
          avgSeoScore: 95,
          avgBestPracticesScore: 91,
          avgLcp: 1400,
          avgCls: 0.02,
          avgInp: 100,
          runCount: 5,
        },
        trend: "improving",
        openAlerts: { critical: 0, moderate: 0, minor: 0 },
        topRegressions: [],
      },
    ],
    summary: {
      totalSites: 2,
      sitesImproving: 1,
      sitesDeclining: 1,
      totalCriticalAlerts: 2,
    },
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printSection("PerfLabs — Test Digest Email");

  if (!process.env.RESEND_API_KEY) {
    console.error(
      "\nError: RESEND_API_KEY is not set. Add it to your .env file.\n",
    );
    process.exit(1);
  }

  let digestData: UserDigestData;

  if (useReal || specificUserId) {
    printSection("Loading real data from DB");
    const { prisma } = await import("../src/lib/prisma.js");
    const { aggregateUserDigest } =
      await import("../src/lib/digest/aggregator.js");

    let userId = specificUserId;

    if (!userId) {
      const user = await prisma.user.findFirst({
        where: { weeklyDigestEnabled: true },
        select: { id: true, email: true },
      });
      if (!user) {
        console.error(
          "\nNo users with weeklyDigestEnabled=true found in DB.\n",
        );
        process.exit(1);
      }
      userId = user.id;
      console.log(`Using first opted-in user: ${user.email} (${user.id})`);
    } else {
      console.log(`Using user ID: ${userId}`);
    }

    const data = await aggregateUserDigest(userId);
    if (!data) {
      console.error(
        "\nNo digest data for this user (no runs in the past 7 days).\n" +
          "Tip: run without --real to send fixture data instead.\n",
      );
      process.exit(1);
    }
    digestData = data;
  } else {
    printSection("Using fixture data");
    console.log("Tip: pass --real to use actual DB data instead.");
    digestData = makeFixtureData(targetEmail);
  }

  // Override the recipient so the email goes to the debug address
  digestData = {
    ...digestData,
    user: { ...digestData.user, email: targetEmail },
  };

  printSection("Sending email");
  console.log(`  To:      ${targetEmail}`);
  console.log(
    `  From:    ${process.env.RESEND_FROM_EMAIL ?? "digest@updates.perflabs.dev"}`,
  );
  console.log(`  Sites:   ${digestData.sites.length}`);
  console.log(`  Alerts:  ${digestData.summary.totalCriticalAlerts} critical`);
  console.log();

  const { sendDigestEmail } = await import("../src/lib/digest/sender.js");
  await sendDigestEmail(digestData);

  printSection("Done");
  console.log(`  Email sent to ${targetEmail}`);
  console.log(`  Check your inbox (and spam folder) if it doesn't appear.`);
  console.log();
}

main()
  .catch((err) => {
    console.error("\nFatal error:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
