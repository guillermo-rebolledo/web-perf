import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const TEST_USER = {
  id: "e2e-test-user-id",
  email: "e2e-test@example.com",
  name: "E2E Test User",
};

export const TEST_SITE = {
  id: "e2e-test-site-id",
  name: "E2E Test Site",
  url: "https://e2e-test.example.com",
};

export const TEST_MONITOR = {
  id: "e2e-test-monitor-id",
  cadenceMinutes: 1440,
  strategy: "mobile",
};

export const TEST_RUN = {
  id: "e2e-test-run-id",
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
