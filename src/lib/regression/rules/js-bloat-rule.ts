import type { RegressionRule, RootCause } from "../rules-engine";
import type { InsightSource } from "@/lib/psi-parser";

/**
 * JS Bloat Rule
 * Detects regressions caused by increased JavaScript bundle size or execution time
 * Applies to: LCP, TBT, INP
 */
const jsBloatRule: RegressionRule = {
  id: "js-bloat",
  appliesTo: ["lcp", "tbt", "inp"],

  detect(metricName, currentRun, baselineRun, diffSummary, currentInsights, baselineInsights) {
    if (!baselineRun) return null;

    const jsBytesDelta = diffSummary.network.jsBytesDelta;
    const scriptingTimeDelta = diffSummary.mainThread.scriptingTimeDelta;

    // Trigger: TBT/INP worsens AND (JS bytes increased OR scripting time increased)
    const jsIncreased = jsBytesDelta > 50000; // +50KB
    const scriptingIncreased = scriptingTimeDelta > 100; // +100ms

    if (!jsIncreased && !scriptingIncreased) {
      return null; // Rule doesn't apply
    }

    // Get bootup-time insights for evidence
    const baselineBootup = baselineInsights.find((i) => i.insightId === "bootup-time");
    const currentBootup = currentInsights.find((i) => i.insightId === "bootup-time");

    const bootupScoreDelta =
      (currentBootup?.score || 1) - (baselineBootup?.score || 1);

    // Calculate confidence
    let confidence = 50; // Medium by default
    if (bootupScoreDelta < -0.1) confidence = 80; // High if bootup-time score dropped significantly
    else if (jsBytesDelta > 100000) confidence = 70; // High if JS increased by 100KB+

    // Extract top JS files by size delta
    const currentBootupSources = (currentBootup?.sources as InsightSource[]) || [];

    const evidence: RootCause["evidence"] = [];

    // Add JS bytes evidence
    if (jsIncreased) {
      evidence.push({
        type: "metric",
        label: "JavaScript Bytes",
        before: baselineRun.totalByteWeight || 0,
        after: currentRun.totalByteWeight || 0,
        delta: `+${(jsBytesDelta / 1024).toFixed(1)} KB`,
      });
    }

    // Add scripting time evidence
    if (scriptingIncreased) {
      evidence.push({
        type: "metric",
        label: "Scripting Time",
        before: (currentBootup?.score || 0) * 1000,
        after: (baselineBootup?.score || 0) * 1000,
        delta: `+${scriptingTimeDelta.toFixed(0)} ms`,
      });
    }

    // Add bootup-time score evidence
    if (baselineBootup && currentBootup) {
      evidence.push({
        type: "audit",
        label: "Bootup Time Score",
        before: (baselineBootup.score || 0).toFixed(2),
        after: (currentBootup.score || 0).toFixed(2),
        delta: bootupScoreDelta.toFixed(2),
      });
    }

    // Add top 3 JS files with largest execution time
    const topFiles = currentBootupSources
      .filter((s) => s.url.endsWith(".js"))
      .sort((a, b) => (b.wastedMs || 0) - (a.wastedMs || 0))
      .slice(0, 3);

    topFiles.forEach((file) => {
      evidence.push({
        type: "resource",
        label: new URL(file.url).pathname.split("/").pop() || file.url,
        before: "-",
        after: `${(file.wastedMs || 0).toFixed(0)} ms`,
        delta: "-",
      });
    });

    return {
      id: "js-bloat",
      title: "JavaScript Bundle Size Increased",
      description: `JavaScript bundle size or execution time increased significantly, causing ${metricName.toUpperCase()} to regress. Large JS bundles delay page interactivity and rendering.`,
      confidence,
      estimatedImpact: Math.max(scriptingTimeDelta, jsBytesDelta / 1000),
      evidence,
      recommendations: [
        "Review recent JavaScript additions or library updates",
        "Use code splitting to reduce initial bundle size",
        "Remove unused JavaScript code",
        "Consider lazy-loading non-critical scripts",
        "Minify and compress JavaScript files",
      ],
    };
  },
};

export default jsBloatRule;
