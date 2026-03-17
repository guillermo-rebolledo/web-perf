import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const TEST_USER = {
  id: "e2e-test-user-id",
  email: "e2e-test@example.com",
  name: "E2E Test User",
};

export const TEST_SITE = {
  id: "cle2etestsite000000001",
  name: "E2E Test Site",
  url: "https://e2e-test.example.com",
};

export const TEST_MONITOR = {
  id: "cle2etestmonitor00001",
  cadenceMinutes: 1440,
  strategy: "mobile",
};

export const TEST_RUN = {
  id: "cle2etestrun000000001",
  status: "success",
  performanceScore: 85,
  accessibilityScore: 92,
  bestPracticesScore: 100,
  seoScore: 90,
  lcp: 2500,
  inp: 200,
  tbt: 150,
  cls: 0.1,
  fcp: 1800,
  ttfb: 600,
};

export async function seedTestData() {
  // Clean up any previous test data first (cascading deletes)
  await cleanup();

  // Create test user
  await prisma.user.create({
    data: {
      id: TEST_USER.id,
      email: TEST_USER.email,
      name: TEST_USER.name,
      emailVerified: new Date(),
    },
  });

  // Create test site
  await prisma.site.create({
    data: {
      id: TEST_SITE.id,
      name: TEST_SITE.name,
      url: TEST_SITE.url,
      userId: TEST_USER.id,
    },
  });

  // Create test monitor
  await prisma.monitor.create({
    data: {
      id: TEST_MONITOR.id,
      siteId: TEST_SITE.id,
      cadenceMinutes: TEST_MONITOR.cadenceMinutes,
      strategy: TEST_MONITOR.strategy,
      isActive: true,
      nextRunAt: new Date(),
      lastRunAt: new Date(),
    },
  });

  // Create a completed test run with realistic scores
  const now = new Date();
  await prisma.run.create({
    data: {
      id: TEST_RUN.id,
      monitorId: TEST_MONITOR.id,
      status: TEST_RUN.status,
      queuedAt: new Date(now.getTime() - 60_000),
      startedAt: new Date(now.getTime() - 30_000),
      completedAt: now,
      performanceScore: TEST_RUN.performanceScore,
      accessibilityScore: TEST_RUN.accessibilityScore,
      bestPracticesScore: TEST_RUN.bestPracticesScore,
      seoScore: TEST_RUN.seoScore,
      lcp: TEST_RUN.lcp,
      inp: TEST_RUN.inp,
      tbt: TEST_RUN.tbt,
      cls: TEST_RUN.cls,
      fcp: TEST_RUN.fcp,
      ttfb: TEST_RUN.ttfb,
    },
  });

  // Create a few audit records for the run
  await prisma.audit.createMany({
    data: [
      {
        runId: TEST_RUN.id,
        auditId: "largest-contentful-paint",
        title: "Largest Contentful Paint",
        score: 0.6,
        displayValue: "2.5 s",
        numericValue: 2500,
      },
      {
        runId: TEST_RUN.id,
        auditId: "first-contentful-paint",
        title: "First Contentful Paint",
        score: 0.7,
        displayValue: "1.8 s",
        numericValue: 1800,
      },
      {
        runId: TEST_RUN.id,
        auditId: "cumulative-layout-shift",
        title: "Cumulative Layout Shift",
        score: 0.95,
        displayValue: "0.1",
        numericValue: 0.1,
      },
    ],
  });
}

// --- Limit seeding helpers ---
// Each helper brings the given resource exactly to the cap so the next API
// call hits the 422 enforcement. Use try/finally + the matching cleanup in
// tests to avoid polluting state for other specs.

export async function seedSitesAtLimit() {
  // TEST_USER already has 1 site (TEST_SITE); create 24 more to reach cap 25.
  await prisma.site.createMany({
    data: Array.from({ length: 24 }, (_, i) => ({
      name: `Limit Site ${i + 1}`,
      url: `https://limit-site-${i + 1}.example.com`,
      userId: TEST_USER.id,
    })),
  });
}

export async function cleanupLimitSites() {
  await prisma.site.deleteMany({
    where: { userId: TEST_USER.id, name: { startsWith: "Limit Site" } },
  });
}

export async function seedMonitorsAtLimit() {
  // TEST_SITE already has 1 monitor (TEST_MONITOR); create 4 more to reach cap 5.
  await prisma.monitor.createMany({
    data: Array.from({ length: 4 }, () => ({
      siteId: TEST_SITE.id,
      cadenceMinutes: 1440,
      strategy: "mobile",
      isActive: false,
      nextRunAt: new Date("2999-12-31"),
    })),
  });
}

export async function cleanupLimitMonitors() {
  // Remove all monitors for TEST_SITE except the canonical one.
  await prisma.monitor.deleteMany({
    where: { siteId: TEST_SITE.id, id: { not: TEST_MONITOR.id } },
  });
}

export async function seedIntegrationsAtLimit() {
  // TEST_USER starts with 0 integrations; create 10 to reach cap.
  await prisma.integration.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      userId: TEST_USER.id,
      name: `Limit Integration ${i + 1}`,
      type: "slack",
      config: {
        type: "slack",
        webhookUrl: `https://hooks.slack.com/services/limit-${i + 1}`,
      },
    })),
  });
}

export async function cleanupLimitIntegrations() {
  await prisma.integration.deleteMany({
    where: { userId: TEST_USER.id, name: { startsWith: "Limit Integration" } },
  });
}

export const TEST_ACTIVITY_EVENTS = [
  {
    id: "e2e-activity-run-completed",
    type: "run_completed",
    entityId: TEST_RUN.id,
    entityType: "run",
    metadata: {
      type: "run_completed",
      siteName: TEST_SITE.name,
      siteUrl: TEST_SITE.url,
      siteId: TEST_SITE.id,
      monitorId: TEST_MONITOR.id,
      performanceScore: TEST_RUN.performanceScore,
    },
  },
  {
    id: "e2e-activity-site-created",
    type: "site_created",
    entityId: TEST_SITE.id,
    entityType: "site",
    metadata: {
      type: "site_created",
      siteName: TEST_SITE.name,
      siteUrl: TEST_SITE.url,
    },
  },
  {
    id: "e2e-activity-run-failed",
    type: "run_failed",
    entityId: TEST_RUN.id,
    entityType: "run",
    metadata: {
      type: "run_failed",
      siteName: TEST_SITE.name,
      siteUrl: TEST_SITE.url,
      siteId: TEST_SITE.id,
      monitorId: TEST_MONITOR.id,
      errorMessage: "PSI API timeout after 30s",
    },
  },
];

export async function seedActivityEvents() {
  // Delete first so a crashed previous run never causes duplicate-ID errors
  await cleanupActivityEvents();
  const now = new Date();
  await prisma.activityEvent.createMany({
    data: TEST_ACTIVITY_EVENTS.map((e, i) => ({
      ...e,
      userId: TEST_USER.id,
      createdAt: new Date(now.getTime() - i * 60_000), // 1 min apart, newest first
    })),
  });
}

export async function cleanupActivityEvents() {
  await prisma.activityEvent.deleteMany({
    where: { id: { in: TEST_ACTIVITY_EVENTS.map((e) => e.id) } },
  });
}

export async function cleanup() {
  // Delete user -- cascading deletes will remove sites, monitors, runs, audits
  try {
    await prisma.user.delete({
      where: { id: TEST_USER.id },
    });
  } catch {
    // User doesn't exist yet, that's fine
  }
}

export async function disconnect() {
  await prisma.$disconnect();
}
