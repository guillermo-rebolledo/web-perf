import type { RegressionRule, RootCause } from "../rules-engine";

/**
 * LCP Resource Change Rule
 * Detects regressions caused by changes to the LCP resource (image, video, text)
 * Applies to: LCP only
 */
export const lcpResourceRule: RegressionRule = {
  id: "lcp-resource",
  appliesTo: ["lcp"],

  detect(_metricName, currentRun, baselineRun, diffSummary, currentInsights, _baselineInsights) {
    if (!baselineRun) return null;

    const lcpResourceChanged = diffSummary.rendering.lcpResourceChanged;
    const imageBytesDelta = diffSummary.network.imageBytesDelta;

    // Trigger: LCP resource changed OR image bytes increased significantly
    if (!lcpResourceChanged && imageBytesDelta < 100000) {
      return null; // Not applicable
    }

    // Calculate confidence
    let confidence = 70; // Medium-high by default
    if (lcpResourceChanged) confidence = 90; // Very high if resource actually changed
    else if (imageBytesDelta > 500000) confidence = 75; // High if images increased by 500KB+

    // Build evidence
    const evidence: RootCause["evidence"] = [];

    // Add LCP resource change evidence
    if (lcpResourceChanged) {
      evidence.push({
        type: "resource",
        label: "LCP Resource Changed",
        before: diffSummary.rendering.lcpResourceBefore || "Unknown",
        after: diffSummary.rendering.lcpResourceAfter || "Unknown",
        delta: "Resource changed",
      });
    }

    // Add image bytes evidence
    if (imageBytesDelta > 0) {
      evidence.push({
        type: "metric",
        label: "Image Bytes",
        before: (currentRun.totalByteWeight || 0) - imageBytesDelta,
        after: currentRun.totalByteWeight || 0,
        delta: `+${(imageBytesDelta / 1024).toFixed(1)} KB`,
      });
    }

    // Add LCP metric evidence
    evidence.push({
      type: "metric",
      label: "LCP (ms)",
      before: baselineRun.lcp || 0,
      after: currentRun.lcp || 0,
      delta: `+${((currentRun.lcp || 0) - (baselineRun.lcp || 0)).toFixed(0)} ms`,
    });

    // Check for lazy-loaded LCP
    const lcpLazyLoaded = currentInsights.find((i) => i.insightId === "lcp-lazy-loaded");
    if (lcpLazyLoaded && lcpLazyLoaded.score && lcpLazyLoaded.score < 1) {
      evidence.push({
        type: "audit",
        label: "LCP Lazy-Loaded",
        before: "Not lazy-loaded",
        after: "Lazy-loaded",
        delta: "Performance issue",
      });
      confidence = 95; // Very high confidence
    }

    return {
      id: "lcp-resource",
      title: "LCP Resource Changed or Increased",
      description: `The Largest Contentful Paint (LCP) resource changed or image sizes increased significantly. This directly impacts how quickly the main content is visible to users.`,
      confidence,
      estimatedImpact: Math.max(
        imageBytesDelta / 1000,
        (currentRun.lcp || 0) - (baselineRun.lcp || 0),
      ),
      evidence,
      recommendations: [
        "Optimize images: compress, use modern formats (WebP, AVIF)",
        "Ensure LCP image is not lazy-loaded",
        "Use responsive images with srcset",
        "Preload the LCP image with <link rel='preload'>",
        "Use a CDN for faster image delivery",
        "Consider image dimensions that match display size",
      ],
    };
  },
};

export default lcpResourceRule;
