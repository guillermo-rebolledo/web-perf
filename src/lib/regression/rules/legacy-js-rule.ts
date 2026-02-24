import type { RegressionRule, RootCause } from "../rules-engine";
import type { InsightSource } from "@/lib/psi-parser";

/**
 * Legacy JavaScript Rule
 * Detects regressions caused by legacy JavaScript (polyfills, transpiled code)
 * Applies to: TBT, INP
 */
export const legacyJsRule: RegressionRule = {
  id: "legacy-js",
  appliesTo: ["tbt", "inp"],

  detect(metricName, currentRun, baselineRun, diffSummary, currentInsights, baselineInsights) {
    if (!baselineRun) return null;

    // Get legacy-javascript insight
    const baselineLegacyJs = baselineInsights.find((i) => i.insightId === "legacy-javascript");
    const currentLegacyJs = currentInsights.find((i) => i.insightId === "legacy-javascript");

    // Trigger: Legacy JS insight worsened
    const legacyJsWorsened =
      currentLegacyJs &&
      baselineLegacyJs &&
      (currentLegacyJs.score || 1) < (baselineLegacyJs.score || 1);

    const currentLegacySources = (currentLegacyJs?.sources as InsightSource[]) || [];
    const baselineLegacySources = (baselineLegacyJs?.sources as InsightSource[]) || [];

    const legacyBytesIncreased = currentLegacySources.length > baselineLegacySources.length;

    if (!legacyJsWorsened && !legacyBytesIncreased) {
      return null;
    }

    // Calculate total legacy JS size
    const currentLegacyBytes = currentLegacySources.reduce(
      (sum, s) => sum + (s.wastedBytes || 0),
      0,
    );
    const baselineLegacyBytes = baselineLegacySources.reduce(
      (sum, s) => sum + (s.wastedBytes || 0),
      0,
    );
    const legacyBytesDelta = currentLegacyBytes - baselineLegacyBytes;

    // Calculate confidence
    let confidence = 60; // Medium by default
    if (legacyBytesDelta > 100000) confidence = 75; // High if +100KB of legacy JS
    else if (legacyBytesIncreased) confidence = 65; // Medium-high if new legacy sources

    // Build evidence
    const evidence: RootCause["evidence"] = [];

    // Add legacy JS score
    if (baselineLegacyJs && currentLegacyJs) {
      evidence.push({
        type: "audit",
        label: "Legacy JavaScript Score",
        before: (baselineLegacyJs.score || 0).toFixed(2),
        after: (currentLegacyJs.score || 0).toFixed(2),
        delta: ((currentLegacyJs.score || 0) - (baselineLegacyJs.score || 0)).toFixed(2),
      });
    }

    // Add legacy bytes delta
    if (legacyBytesDelta > 0) {
      evidence.push({
        type: "metric",
        label: "Legacy JavaScript Bytes",
        before: baselineLegacyBytes,
        after: currentLegacyBytes,
        delta: `+${(legacyBytesDelta / 1024).toFixed(1)} KB`,
      });
    }

    // Add top legacy JS files
    currentLegacySources
      .sort((a, b) => (b.wastedBytes || 0) - (a.wastedBytes || 0))
      .slice(0, 3)
      .forEach((source) => {
        evidence.push({
          type: "resource",
          label: new URL(source.url).pathname.split("/").pop() || source.url,
          before: "-",
          after: `${((source.wastedBytes || 0) / 1024).toFixed(1)} KB polyfills`,
          delta: "-",
        });
      });

    return {
      id: "legacy-js",
      title: "Legacy JavaScript (Polyfills) Increased",
      description: `Legacy JavaScript code (polyfills, transpiled ES5) increased, causing ${metricName.toUpperCase()} to regress. Modern browsers don't need many polyfills, but are forced to download and parse them anyway.`,
      confidence,
      estimatedImpact: legacyBytesDelta / 1000,
      evidence,
      recommendations: [
        "Use modern JavaScript syntax (ES6+) and skip transpilation for modern browsers",
        "Serve different bundles for modern vs legacy browsers (differential loading)",
        "Remove unnecessary polyfills",
        "Update build tools (Babel, webpack) to target modern browsers",
        "Use module/nomodule pattern to serve optimal bundles",
      ],
    };
  },
};

export default legacyJsRule;
