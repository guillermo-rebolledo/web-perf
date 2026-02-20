import type { User, Site, Monitor, Run, Audit } from "@prisma/client";
import type { PSIResponse } from "@/lib/psi-parser";

// ---- Entity factories ----

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    emailVerified: null,
    image: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createSite(overrides: Partial<Site> = {}): Site {
  return {
    id: "test-site-id",
    name: "Test Site",
    url: "https://example.com",
    userId: "test-user-id",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createMonitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: "test-monitor-id",
    siteId: "test-site-id",
    cadenceMinutes: 1440,
    strategy: "mobile",
    isActive: true,
    nextRunAt: new Date("2025-01-01"),
    lastRunAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createRun(overrides: Partial<Run> = {}): Run {
  return {
    id: "test-run-id",
    monitorId: "test-monitor-id",
    status: "success",
    jobId: "test-job-id",
    queuedAt: new Date("2025-01-01T00:00:00Z"),
    startedAt: new Date("2025-01-01T00:00:01Z"),
    completedAt: new Date("2025-01-01T00:00:30Z"),
    errorMessage: null,
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
    lighthouseVersion: null,
    finalUrl: null,
    runWarnings: [],
    speedIndex: null,
    tti: null,
    totalByteWeight: null,
    numRequests: null,
    mainThreadWork: null,
    screenshotData: null,
    ...overrides,
  };
}

export function createAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    id: "test-audit-id",
    runId: "test-run-id",
    auditId: "first-contentful-paint",
    title: "First Contentful Paint",
    score: 0.7,
    displayValue: "1.8 s",
    numericValue: 1800,
    ...overrides,
  };
}

// ---- PSI response fixture ----

export function createPSIResponse(
  overrides: Partial<PSIResponse> = {}
): PSIResponse {
  return {
    lighthouseResult: {
      categories: {
        performance: { score: 0.85 },
        accessibility: { score: 0.92 },
        "best-practices": { score: 1 },
        seo: { score: 0.9 },
      },
      audits: {
        "largest-contentful-paint": {
          id: "largest-contentful-paint",
          title: "Largest Contentful Paint",
          score: 0.6,
          displayValue: "2.5 s",
          numericValue: 2500,
          numericUnit: "millisecond",
        },
        "interaction-to-next-paint": {
          id: "interaction-to-next-paint",
          title: "Interaction to Next Paint",
          score: 0.7,
          displayValue: "200 ms",
          numericValue: 200,
          numericUnit: "millisecond",
        },
        "total-blocking-time": {
          id: "total-blocking-time",
          title: "Total Blocking Time",
          score: 0.8,
          displayValue: "150 ms",
          numericValue: 150,
          numericUnit: "millisecond",
        },
        "cumulative-layout-shift": {
          id: "cumulative-layout-shift",
          title: "Cumulative Layout Shift",
          score: 0.95,
          displayValue: "0.1",
          numericValue: 0.1,
          numericUnit: "unitless",
        },
        "first-contentful-paint": {
          id: "first-contentful-paint",
          title: "First Contentful Paint",
          score: 0.7,
          displayValue: "1.8 s",
          numericValue: 1800,
          numericUnit: "millisecond",
        },
        "server-response-time": {
          id: "server-response-time",
          title: "Initial server response time was short",
          score: 0.9,
          displayValue: "Root document took 600 ms",
          numericValue: 600,
          numericUnit: "millisecond",
        },
        "final-screenshot": {
          id: "final-screenshot",
          title: "Final Screenshot",
          score: null,
          details: {
            data: "data:image/jpeg;base64,/9j/fakescreenshot",
          },
        },
        "render-blocking-resources": {
          id: "render-blocking-resources",
          title: "Eliminate render-blocking resources",
          score: 0.5,
          displayValue: "Potential savings of 300 ms",
          numericValue: 300,
        },
        "unused-javascript": {
          id: "unused-javascript",
          title: "Reduce unused JavaScript",
          score: 0.3,
          displayValue: "Potential savings of 150 KiB",
          numericValue: 150000,
        },
        "speed-index": {
          id: "speed-index",
          title: "Speed Index",
          score: 0.7,
          displayValue: "3.2 s",
          numericValue: 3200,
          numericUnit: "millisecond",
        },
        interactive: {
          id: "interactive",
          title: "Time to Interactive",
          score: 0.6,
          displayValue: "4.1 s",
          numericValue: 4100,
          numericUnit: "millisecond",
        },
        "mainthread-work-breakdown": {
          id: "mainthread-work-breakdown",
          title: "Minimize main-thread work",
          score: 0.5,
          displayValue: "2.8 s",
          numericValue: 2800,
          numericUnit: "millisecond",
        },
        diagnostics: {
          id: "diagnostics",
          title: "Diagnostics",
          score: null,
          details: {
            items: [
              {
                totalByteWeight: 512000,
                numRequests: 42,
              },
            ],
          },
        },
        "image-delivery-insight": {
          id: "image-delivery-insight",
          title: "Deliver images in modern formats",
          description: "Consider using WebP or AVIF for smaller file sizes.",
          score: 0.4,
          displayValue: "Est savings of 94 KiB",
          metricSavings: { LCP: 50, FCP: 0 },
        },
        "render-blocking-insight": {
          id: "render-blocking-insight",
          title: "Eliminate render-blocking resources",
          description: "Resources are blocking the first paint of your page.",
          score: 0.6,
          displayValue: "Potential savings of 300 ms",
          metricSavings: { FCP: 300, LCP: 150 },
        },
      },
      lighthouseVersion: "12.4.0",
      finalUrl: "https://example.com/",
      runWarnings: [],
      fetchTime: "2025-01-01T00:00:00Z",
    },
    ...overrides,
  };
}
