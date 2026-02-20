/**
 * Official Lighthouse metric thresholds per strategy.
 *
 * Sources:
 *  - FCP: https://developer.chrome.com/docs/lighthouse/performance/first-contentful-paint
 *  - LCP: https://web.dev/articles/lcp
 *  - INP: https://web.dev/articles/inp
 *  - TBT: https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time
 *  - CLS: https://web.dev/articles/cls
 *  - TTFB: https://web.dev/articles/ttfb
 *  - Speed Index: https://developer.chrome.com/docs/lighthouse/performance/speed-index
 *  - TTI: https://developer.chrome.com/docs/lighthouse/performance/interactive
 */

export interface MetricThreshold {
  good: number;
  needsImprovement: number;
}

export interface StrategyThresholds {
  lcp: MetricThreshold;
  inp: MetricThreshold;
  tbt: MetricThreshold;
  cls: MetricThreshold;
  fcp: MetricThreshold;
  ttfb: MetricThreshold;
  speedIndex: MetricThreshold;
  tti: MetricThreshold;
  // These don't have official per-strategy thresholds
  byteWeight: MetricThreshold;
  requests: MetricThreshold;
  mainThread: MetricThreshold;
}

const mobileThresholds: StrategyThresholds = {
  lcp: { good: 2500, needsImprovement: 4000 },
  inp: { good: 200, needsImprovement: 500 },
  tbt: { good: 200, needsImprovement: 600 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fcp: { good: 1800, needsImprovement: 3000 },
  ttfb: { good: 800, needsImprovement: 1800 },
  speedIndex: { good: 3400, needsImprovement: 5800 },
  tti: { good: 3800, needsImprovement: 7300 },
  byteWeight: { good: 1500, needsImprovement: 3000 },
  requests: { good: 50, needsImprovement: 100 },
  mainThread: { good: 2000, needsImprovement: 4000 },
};

const desktopThresholds: StrategyThresholds = {
  lcp: { good: 2500, needsImprovement: 4000 },
  inp: { good: 200, needsImprovement: 500 },
  tbt: { good: 150, needsImprovement: 350 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fcp: { good: 900, needsImprovement: 1600 },
  ttfb: { good: 800, needsImprovement: 1800 },
  speedIndex: { good: 1300, needsImprovement: 2300 },
  tti: { good: 3800, needsImprovement: 7300 },
  byteWeight: { good: 1500, needsImprovement: 3000 },
  requests: { good: 50, needsImprovement: 100 },
  mainThread: { good: 2000, needsImprovement: 4000 },
};

export function getThresholds(strategy: "mobile" | "desktop"): StrategyThresholds {
  return strategy === "desktop" ? desktopThresholds : mobileThresholds;
}
