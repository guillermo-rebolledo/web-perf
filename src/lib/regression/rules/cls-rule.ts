import type { RegressionRule, RootCause } from "../rules-engine";
import type { InsightSource } from "@/lib/psi-parser";

/**
 * CLS / Layout Shift Rule
 * Detects regressions caused by layout shifts
 * Applies to: CLS only
 */
export const clsRule: RegressionRule = {
  id: "cls",
  appliesTo: ["cls"],

  detect(metricName, currentRun, baselineRun, diffSummary, currentInsights, baselineInsights) {
    if (!baselineRun) return null;

    const clsShiftSourcesChanged = diffSummary.rendering.clsShiftSourcesChanged;
    const clsElementCount = diffSummary.rendering.clsElementCount;

    // Trigger: CLS regressed (always applicable for CLS metric)
    if (!clsShiftSourcesChanged && clsElementCount === 0) {
      return null; // No shift elements identified
    }

    // Get layout-shift-elements insight
    const baselineShiftElements = baselineInsights.find(
      (i) => i.insightId === "layout-shift-elements",
    );
    const currentShiftElements = currentInsights.find(
      (i) => i.insightId === "layout-shift-elements",
    );

    const baselineElements = (baselineShiftElements?.sources as InsightSource[]) || [];
    const currentElements = (currentShiftElements?.sources as InsightSource[]) || [];

    // Calculate confidence
    let confidence = 50; // Low-medium by default
    if (clsElementCount > 0 && currentElements.length > 0) {
      confidence = 80; // High if specific elements identified
    } else {
      confidence = 40; // Low if no specific elements
    }

    // Build evidence
    const evidence: RootCause["evidence"] = [];

    // Add CLS metric evidence
    evidence.push({
      type: "metric",
      label: "Cumulative Layout Shift (CLS)",
      before: (baselineRun.cls || 0).toFixed(3),
      after: (currentRun.cls || 0).toFixed(3),
      delta: `+${((currentRun.cls || 0) - (baselineRun.cls || 0)).toFixed(3)}`,
    });

    // Add shift element count
    evidence.push({
      type: "metric",
      label: "Elements Causing Shifts",
      before: baselineElements.length,
      after: currentElements.length,
      delta: currentElements.length - baselineElements.length,
    });

    // Add specific shift sources
    currentElements.slice(0, 5).forEach((element, index) => {
      const elementDesc = element.node
        ? JSON.parse(element.node as string)?.selector || "Unknown element"
        : "Unknown element";

      evidence.push({
        type: "resource",
        label: `Shift Source ${index + 1}`,
        before: "-",
        after: elementDesc,
        delta: element.score ? element.score.toFixed(3) : "-",
      });
    });

    return {
      id: "cls",
      title: "Layout Shifts Increased",
      description: `Cumulative Layout Shift (CLS) increased, indicating that elements on the page are moving unexpectedly during load. This creates a poor user experience and affects visual stability.`,
      confidence,
      estimatedImpact: ((currentRun.cls || 0) - (baselineRun.cls || 0)) * 1000,
      evidence,
      recommendations: [
        "Add explicit width/height attributes to images and videos",
        "Reserve space for ads and embeds with min-height",
        "Avoid inserting content above existing content",
        "Use CSS aspect-ratio for responsive images",
        "Preload fonts and use font-display: swap carefully",
        "Ensure dynamic content has reserved space",
      ],
    };
  },
};

export default clsRule;
