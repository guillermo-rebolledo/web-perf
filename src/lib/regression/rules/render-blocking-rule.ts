import type { RegressionRule, RootCause } from "../rules-engine";
import type { InsightSource } from "@/lib/psi-parser";

/**
 * Render-Blocking Resources Rule
 * Detects regressions caused by render-blocking CSS/JS
 * Applies to: FCP, LCP
 */
export const renderBlockingRule: RegressionRule = {
  id: "render-blocking",
  appliesTo: ["fcp", "lcp"],

  detect(metricName, currentRun, baselineRun, diffSummary, currentInsights, baselineInsights) {
    if (!baselineRun) return null;

    // Check for render-blocking-resources insight (this is a Lighthouse audit)
    const baselineRenderBlocking = baselineInsights.find(
      (i) => i.insightId === "render-blocking-resources" || i.insightId.includes("render-blocking"),
    );
    const currentRenderBlocking = currentInsights.find(
      (i) => i.insightId === "render-blocking-resources" || i.insightId.includes("render-blocking"),
    );

    // If no insight data, check CSS delta as proxy
    const cssBytesDelta = diffSummary.network.cssBytesDelta;
    const jsBytesDelta = diffSummary.network.jsBytesDelta;

    const renderBlockingWorsened =
      currentRenderBlocking &&
      baselineRenderBlocking &&
      (currentRenderBlocking.score || 1) < (baselineRenderBlocking.score || 1);

    const hasSignificantCssJsIncrease = cssBytesDelta > 50000 || jsBytesDelta > 100000;

    if (!renderBlockingWorsened && !hasSignificantCssJsIncrease) {
      return null;
    }

    const currentSources = (currentRenderBlocking?.sources as InsightSource[]) || [];
    const baselineSources = (baselineRenderBlocking?.sources as InsightSource[]) || [];

    // Find new blocking resources
    const baselineUrls = new Set(baselineSources.map((s) => s.url));
    const newBlockingResources = currentSources.filter(
      (s) => !baselineUrls.has(s.url),
    );

    // Calculate confidence
    let confidence = 60; // Medium by default
    if (newBlockingResources.length > 0) confidence = 75; // High if new blocking resources
    else if (renderBlockingWorsened) confidence = 65; // Medium-high if score worsened

    // Build evidence
    const evidence: RootCause["evidence"] = [];

    // Add render-blocking score evidence
    if (baselineRenderBlocking && currentRenderBlocking) {
      evidence.push({
        type: "audit",
        label: "Render-Blocking Score",
        before: (baselineRenderBlocking.score || 0).toFixed(2),
        after: (currentRenderBlocking.score || 0).toFixed(2),
        delta: ((currentRenderBlocking.score || 0) - (baselineRenderBlocking.score || 0)).toFixed(2),
      });
    }

    // Add CSS/JS bytes evidence
    if (cssBytesDelta > 0) {
      evidence.push({
        type: "metric",
        label: "CSS Bytes",
        before: (currentRun.totalByteWeight || 0) - cssBytesDelta,
        after: currentRun.totalByteWeight || 0,
        delta: `+${(cssBytesDelta / 1024).toFixed(1)} KB`,
      });
    }

    // Add new blocking resources
    newBlockingResources.slice(0, 3).forEach((resource) => {
      evidence.push({
        type: "resource",
        label: `New Blocking Resource`,
        before: "Not present",
        after: resource.url,
        delta: `${(resource.wastedMs || 0).toFixed(0)} ms blocked`,
      });
    });

    // Estimate impact
    const estimatedImpact = newBlockingResources.reduce(
      (sum, r) => sum + (r.wastedMs || 0),
      0,
    ) || Math.max(cssBytesDelta / 1000, jsBytesDelta / 1000);

    return {
      id: "render-blocking",
      title: "Render-Blocking Resources Added",
      description: `New render-blocking CSS or JavaScript resources were added, delaying ${metricName.toUpperCase()}. The browser must download and parse these resources before rendering the page.`,
      confidence,
      estimatedImpact,
      evidence,
      recommendations: [
        "Inline critical CSS and defer non-critical CSS",
        "Use async or defer attributes for non-critical JavaScript",
        "Split CSS into critical and non-critical files",
        "Consider using CSS-in-JS or inline styles for above-the-fold content",
        "Minimize render-blocking resources with proper loading strategies",
      ],
    };
  },
};

export default renderBlockingRule;
