/**
 * Pure data helpers for seed-regressions.ts.
 * Extracted here so they can be unit-tested without importing the seed
 * script (which has module-level process.argv / process.exit side effects).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type InsightData = {
  runId: string;
  insightId: string;
  title: string;
  description: string;
  score: number;
  sources: unknown[];
};

type InsightFactory = (runId: string, index: number) => InsightData;

// ── Insight factories ────────────────────────────────────────────────────────
// Each factory returns the data needed for prisma.insight.createMany given the
// run id and the loop index (used for deterministic-but-varied field values).

export const INSIGHT_FACTORIES: Record<string, InsightFactory> = {
  "bootup-time": (runId) => ({
    runId,
    insightId: "bootup-time",
    title: "JavaScript execution time",
    description: "Reduce JavaScript execution time",
    score: 0.5 + Math.random() * 0.2,
    sources: [
      { url: "https://example.com/app.js", wastedMs: 300 + Math.random() * 200 },
      { url: "https://example.com/vendor.js", wastedMs: 200 + Math.random() * 150 },
    ],
  }),
  "third-party-summary": (runId, index) => ({
    runId,
    insightId: "third-party-summary",
    title: "Third-party code",
    description: "Third-party scripts blocking the main thread",
    score: 0.4 + Math.random() * 0.2,
    sources: [
      {
        url: `https://analytics.domain${index % 5}.com`,
        blockingTime: 300 + Math.random() * 200,
        transferSize: 150000 + Math.random() * 100000,
      },
    ],
  }),
  "largest-contentful-paint-element": (runId) => ({
    runId,
    insightId: "largest-contentful-paint-element",
    title: "Largest Contentful Paint element",
    description: "Optimize the element identified as the LCP",
    score: 0.5 + Math.random() * 0.2,
    sources: [{ node: '{"selector": "img.hero"}' }],
  }),
  "long-tasks": (runId) => ({
    runId,
    insightId: "long-tasks",
    title: "Long tasks",
    description: "Avoid long main-thread tasks",
    score: 0.4 + Math.random() * 0.2,
    sources: [
      { url: "https://example.com/app.js", duration: 250 + Math.random() * 100 },
      { url: "https://example.com/handler.js", duration: 200 + Math.random() * 80 },
    ],
  }),
  "mainthread-work-breakdown": (runId) => ({
    runId,
    insightId: "mainthread-work-breakdown",
    title: "Minimize main-thread work",
    description: "Consider reducing the time spent parsing, compiling and executing JS",
    score: 0.5 + Math.random() * 0.2,
    sources: [
      { group: "Script Evaluation", duration: 1200 + Math.random() * 300 },
      { group: "Style & Layout", duration: 400 + Math.random() * 100 },
    ],
  }),
  "layout-shift-elements": (runId, index) => ({
    runId,
    insightId: "layout-shift-elements",
    title: "Layout shift elements",
    description: "Elements causing layout shifts",
    score: 0.3 + Math.random() * 0.2,
    sources: [
      { node: `{"selector": "div.element-${index}"}`, score: 0.05 + Math.random() * 0.05 },
      { node: '{"selector": "img.lazy"}', score: 0.03 + Math.random() * 0.03 },
    ],
  }),
  "offscreen-images": (runId, index) => ({
    runId,
    insightId: "offscreen-images",
    title: "Defer offscreen images",
    description: "Consider lazy-loading offscreen images",
    score: 0.6 + Math.random() * 0.2,
    sources: [
      { url: `https://example.com/image${index}.jpg`, wastedMs: 150 + Math.random() * 100 },
    ],
  }),
  "uses-optimized-images": (runId, index) => ({
    runId,
    insightId: "uses-optimized-images",
    title: "Efficiently encode images",
    description: "Optimized images load faster and consume less cellular data",
    score: 0.6 + Math.random() * 0.2,
    sources: [
      {
        url: `https://example.com/photo${index}.png`,
        wastedBytes: 80000 + Math.random() * 40000,
      },
    ],
  }),
  "render-blocking-resources": (runId) => ({
    runId,
    insightId: "render-blocking-resources",
    title: "Eliminate render-blocking resources",
    description: "Resources are blocking the first paint of your page",
    score: 0.4 + Math.random() * 0.2,
    sources: [
      { url: "https://example.com/styles.css", wastedMs: 300 + Math.random() * 150 },
      { url: "https://example.com/fonts.css", wastedMs: 200 + Math.random() * 100 },
    ],
  }),
  "unminified-css": (runId) => ({
    runId,
    insightId: "unminified-css",
    title: "Minify CSS",
    description: "Minifying CSS files can reduce network payload sizes",
    score: 0.7 + Math.random() * 0.2,
    sources: [
      { url: "https://example.com/styles.css", wastedBytes: 12000 + Math.random() * 5000 },
    ],
  }),
  "server-response-time": (runId) => ({
    runId,
    insightId: "server-response-time",
    title: "Server response time",
    description: "Reduce server response time",
    score: 0.4 + Math.random() * 0.2,
    sources: [{ url: "https://example.com", responseTime: 800 + Math.random() * 200 }],
  }),
  "network-server-latency": (runId) => ({
    runId,
    insightId: "network-server-latency",
    title: "Network server latency",
    description: "Reduce the network round trip time",
    score: 0.5 + Math.random() * 0.2,
    sources: [{ origin: "https://example.com", latency: 400 + Math.random() * 200 }],
  }),
};

// ── Regression type templates ─────────────────────────────────────────────────

export const REGRESSION_TYPES = [
  {
    name: "LCP",
    metric: "lcp",
    baseMultiplier: 1.6,
    insights: [
      "bootup-time",
      "third-party-summary",
      "largest-contentful-paint-element",
    ],
  },
  {
    name: "TBT",
    metric: "tbt",
    baseMultiplier: 1.8,
    insights: ["long-tasks", "mainthread-work-breakdown"],
  },
  {
    name: "CLS",
    metric: "cls",
    baseMultiplier: 2.0,
    insights: ["layout-shift-elements"],
  },
  {
    name: "FCP",
    metric: "fcp",
    baseMultiplier: 1.4,
    insights: ["offscreen-images", "uses-optimized-images"],
  },
  {
    name: "Speed Index",
    metric: "speedIndex",
    baseMultiplier: 1.37,
    insights: ["render-blocking-resources", "unminified-css"],
  },
  {
    name: "TTFB",
    metric: "ttfb",
    baseMultiplier: 1.8,
    insights: ["server-response-time", "network-server-latency"],
  },
  {
    name: "INP",
    metric: "inp",
    baseMultiplier: 1.94,
    insights: ["long-tasks", "bootup-time"],
  },
] as const;

type RegressionType = (typeof REGRESSION_TYPES)[number];
