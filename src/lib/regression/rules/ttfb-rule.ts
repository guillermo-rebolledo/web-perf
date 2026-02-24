import type { RegressionRule, RootCause } from "../rules-engine";

/**
 * TTFB / Backend Rule
 * Detects regressions caused by slow server response time
 * Applies to: LCP, FCP, TTFB
 */
export const ttfbRule: RegressionRule = {
  id: "ttfb",
  appliesTo: ["lcp", "fcp", "ttfb"],

  detect(metricName, currentRun, baselineRun, diffSummary, _currentInsights, _baselineInsights) {
    if (!baselineRun) return null;

    const ttfbDelta = diffSummary.backend.ttfbDelta;
    const serverLatencyDelta = diffSummary.backend.serverLatencyDelta;

    // Trigger: TTFB increased OR server latency increased
    if (ttfbDelta < 100 && serverLatencyDelta < 100) {
      return null; // Not significant enough
    }

    // Calculate confidence
    let confidence = 60; // Medium by default
    if (ttfbDelta > 200) confidence = 85; // High if TTFB increased by 200ms+
    else if (ttfbDelta > 100) confidence = 70; // Medium-high if +100ms

    // Build evidence
    const evidence: RootCause["evidence"] = [];

    // Add TTFB evidence
    evidence.push({
      type: "metric",
      label: "Time to First Byte (TTFB)",
      before: baselineRun.ttfb || 0,
      after: currentRun.ttfb || 0,
      delta: `+${ttfbDelta.toFixed(0)} ms`,
    });

    // Add server latency evidence if available
    if (serverLatencyDelta !== 0) {
      evidence.push({
        type: "metric",
        label: "Server Latency",
        before: (currentRun.ttfb || 0) - serverLatencyDelta,
        after: currentRun.ttfb || 0,
        delta: `+${serverLatencyDelta.toFixed(0)} ms`,
      });
    }

    // Add affected metrics
    if (metricName === "lcp" && currentRun.lcp && baselineRun.lcp) {
      evidence.push({
        type: "metric",
        label: "LCP Impact",
        before: baselineRun.lcp,
        after: currentRun.lcp,
        delta: `+${(currentRun.lcp - baselineRun.lcp).toFixed(0)} ms`,
      });
    }

    return {
      id: "ttfb",
      title: "Slow Server Response Time",
      description: `Server response time (TTFB) increased significantly, delaying when the browser can start rendering the page. This affects ${metricName.toUpperCase()} and overall page load performance.`,
      confidence,
      estimatedImpact: ttfbDelta,
      evidence,
      recommendations: [
        "Investigate server-side performance issues",
        "Check database query performance",
        "Review recent backend code changes or deployments",
        "Consider implementing server-side caching",
        "Use a CDN to reduce network latency",
        "Monitor server CPU/memory usage",
        "Optimize API endpoints and reduce payload sizes",
      ],
    };
  },
};

export default ttfbRule;
