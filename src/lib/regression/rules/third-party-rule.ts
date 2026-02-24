import type { RegressionRule, RootCause } from "../rules-engine";
import type { InsightSource } from "@/lib/psi-parser";

/**
 * Third-Party Script Rule
 * Detects regressions caused by third-party scripts (analytics, ads, widgets)
 * Applies to: LCP, TBT, INP, FCP
 */
export const thirdPartyRule: RegressionRule = {
  id: "third-party",
  appliesTo: ["lcp", "tbt", "inp", "fcp"],

  detect(metricName, currentRun, baselineRun, diffSummary, currentInsights, _baselineInsights) {
    if (!baselineRun) return null;

    const newDomains = diffSummary.network.newDomains;
    const thirdPartyBytesDelta = diffSummary.network.thirdPartyBytesDelta;

    // Trigger: New third-party domain OR increased third-party bytes
    const hasNewDomain = newDomains.length > 0;
    const thirdPartyIncreased = thirdPartyBytesDelta > 50000; // +50KB

    if (!hasNewDomain && !thirdPartyIncreased) {
      return null;
    }

    // Get third-party-summary insights
    const currentThirdParty = currentInsights.find((i) => i.insightId === "third-party-summary");

    const currentSources = (currentThirdParty?.sources as InsightSource[]) || [];

    // Calculate confidence
    let confidence = 60; // Medium by default
    if (hasNewDomain) confidence = 85; // High if new domain detected
    else if (thirdPartyBytesDelta > 100000) confidence = 75; // High if +100KB

    // Build evidence
    const evidence: RootCause["evidence"] = [];

    // Add new domains evidence
    if (hasNewDomain) {
      newDomains.forEach((domain) => {
        evidence.push({
          type: "resource",
          label: `New Domain: ${domain}`,
          before: "Not present",
          after: "Added",
          delta: "+1 domain",
        });
      });
    }

    // Add third-party bytes evidence
    if (thirdPartyBytesDelta !== 0) {
      evidence.push({
        type: "metric",
        label: "Third-Party Bytes",
        before: thirdPartyBytesDelta > 0 ? (currentRun.totalByteWeight || 0) - thirdPartyBytesDelta : 0,
        after: currentRun.totalByteWeight || 0,
        delta: `${thirdPartyBytesDelta > 0 ? '+' : ''}${(thirdPartyBytesDelta / 1024).toFixed(1)} KB`,
      });
    }

    // Add top 3 third-party scripts by impact
    const topThirdParty = currentSources
      .sort((a, b) => (b.blockingTime || 0) - (a.blockingTime || 0))
      .slice(0, 3);

    topThirdParty.forEach((source) => {
      evidence.push({
        type: "resource",
        label: source.url,
        before: "-",
        after: `${(source.blockingTime || 0).toFixed(0)} ms blocking`,
        delta: `${((source.transferSize || 0) / 1024).toFixed(1)} KB`,
      });
    });

    // Estimate impact (blocking time or byte delta)
    const estimatedImpact = Math.max(
      thirdPartyBytesDelta / 1000,
      topThirdParty.reduce((sum, s) => sum + (s.blockingTime || 0), 0),
    );

    return {
      id: "third-party",
      title: "Third-Party Scripts Added or Increased",
      description: `Third-party scripts (analytics, ads, widgets) were added or significantly increased, causing ${metricName.toUpperCase()} to regress. Third-party code often blocks the main thread and delays rendering.`,
      confidence,
      estimatedImpact,
      evidence,
      recommendations: [
        "Review recently added third-party scripts",
        "Load non-critical third-party scripts asynchronously with async/defer",
        "Consider self-hosting critical third-party resources",
        "Use facade patterns for heavy widgets (load on interaction)",
        "Monitor third-party performance with resource hints",
      ],
    };
  },
};

export default thirdPartyRule;
