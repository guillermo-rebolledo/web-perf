import type { User, Site, Monitor, Run, Audit } from "@prisma/client";
import { RunStatus } from "@prisma/client";
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
    triggerType: "schedule",
    githubRepo: null,
    githubBranch: null,
    githubWebhookSecret: null,
    ...overrides,
  };
}

export function createRun(overrides: Partial<Run> = {}): Run {
  return {
    id: "test-run-id",
    monitorId: "test-monitor-id",
    status: RunStatus.success,
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
    browserUserAgent: "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36",
    benchmarkIndex: 1234.5,
    emulatedFormFactor: "mobile",
    aiSummary: null,
    aiSummaryAt: null,
    aiSummaryModel: null,
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
    scored: true,
    displayValue: "1.8 s",
    numericValue: 1800,
    details: null,
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
        performance: {
          score: 0.85,
          auditRefs: [
            { id: "largest-contentful-paint", weight: 25 },
            { id: "first-contentful-paint", weight: 10 },
            { id: "total-blocking-time", weight: 30 },
            { id: "cumulative-layout-shift", weight: 25 },
            { id: "speed-index", weight: 10 },
            { id: "interaction-to-next-paint", weight: 0 },
            { id: "render-blocking-resources", weight: 0 },
            { id: "unused-javascript", weight: 0 },
            { id: "image-delivery-insight", weight: 0 },
            { id: "render-blocking-insight", weight: 0 },
            { id: "network-dependency-tree-insight", weight: 0 },
          ],
        },
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
          description: "Reduce unused JavaScript and defer loading scripts until they are required.",
          score: 0.3,
          displayValue: "Potential savings of 150 KiB",
          numericValue: 150000,
          metricSavings: { LCP: 50, FCP: 0 },
          details: {
            type: "opportunity",
            items: [
              { url: "https://example.com/client.js", totalBytes: 60000, wastedBytes: 27000, wastedPercent: 45 },
              { url: "https://example.com/vendor.js", totalBytes: 41000, wastedBytes: 24000, wastedPercent: 58 },
            ],
          },
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
          details: {
            items: [
              { url: "https://example.com/hero.png", totalBytes: 250000, wastedBytes: 94000 },
              { url: "https://example.com/logo.png", totalBytes: 15000, wastedBytes: 8000 },
            ],
          },
        },
        "render-blocking-insight": {
          id: "render-blocking-insight",
          title: "Eliminate render-blocking resources",
          description: "Resources are blocking the first paint of your page.",
          score: 0.6,
          displayValue: "Potential savings of 300 ms",
          metricSavings: { FCP: 300, LCP: 150 },
          details: {
            items: [
              { url: "https://example.com/styles.css", wastedMs: 200 },
              { url: "https://example.com/app.js", wastedMs: 100 },
            ],
          },
        },
        "network-dependency-tree-insight": {
          id: "network-dependency-tree-insight",
          title: "Network dependency tree",
          description: "Avoid chaining critical requests.",
          score: 0,
          metricSavings: { LCP: 0 },
          details: {
            type: "list",
            items: [
              {
                type: "list-section",
                value: {
                  type: "network-tree",
                  longestChain: { duration: 900 },
                  chains: {
                    root: {
                      url: "https://example.com/",
                      transferSize: 7500,
                      children: {
                        child1: {
                          url: "https://example.com/style.css",
                          transferSize: 6000,
                          children: {
                            grandchild1: {
                              url: "https://example.com/font.woff2",
                              transferSize: 15000,
                              children: {},
                            },
                          },
                        },
                        child2: {
                          url: "https://example.com/app.js",
                          transferSize: 2400,
                          children: {},
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      lighthouseVersion: "12.4.0",
      finalUrl: "https://example.com/",
      runWarnings: [],
      fetchTime: "2025-01-01T00:00:00Z",
      environment: {
        networkUserAgent: "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36",
        hostUserAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        benchmarkIndex: 1234.5,
      },
      configSettings: {
        emulatedFormFactor: "mobile",
        formFactor: "mobile",
        locale: "en-US",
      },
    },
    ...overrides,
  };
}
