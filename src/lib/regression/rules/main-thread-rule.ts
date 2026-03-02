import type { RegressionRule, RootCause } from "../rules-engine";
import type { InsightSource } from "@/lib/psi-parser";

/**
 * Main Thread Contention Rule
 * Detects regressions caused by excessive main thread work
 * Applies to: TBT, INP
 */
const mainThreadRule: RegressionRule = {
  id: "main-thread",
  appliesTo: ["tbt", "inp"],

  detect(metricName, currentRun, baselineRun, diffSummary, currentInsights, _baselineInsights) {
    if (!baselineRun) return null;

    const longTaskCountDelta = diffSummary.mainThread.longTaskCountDelta;
    const totalMainThreadTimeDelta = diffSummary.mainThread.totalMainThreadTimeDelta;

    // Trigger: Long tasks increased OR main thread time increased
    if (longTaskCountDelta <= 0 && totalMainThreadTimeDelta < 100) {
      return null;
    }

    // Get long-tasks and mainthread-work-breakdown insights
    const currentLongTasks = currentInsights.find((i) => i.insightId === "long-tasks");
    const currentMainThread = currentInsights.find(
      (i) => i.insightId === "mainthread-work-breakdown",
    );

    const currentLongTaskSources = (currentLongTasks?.sources as InsightSource[]) || [];
    const currentMainThreadSources = (currentMainThread?.sources as InsightSource[]) || [];

    // Calculate confidence
    let confidence = 65; // Medium by default
    if (longTaskCountDelta > 2) confidence = 80; // High if 3+ new long tasks
    else if (totalMainThreadTimeDelta > 500) confidence = 75; // High if +500ms

    // Build evidence
    const evidence: RootCause["evidence"] = [];

    // Add main thread work evidence
    evidence.push({
      type: "metric",
      label: "Total Main Thread Work",
      before: baselineRun.mainThreadWork || 0,
      after: currentRun.mainThreadWork || 0,
      delta: `+${totalMainThreadTimeDelta.toFixed(0)} ms`,
    });

    // Add long tasks count
    if (longTaskCountDelta !== 0) {
      evidence.push({
        type: "metric",
        label: "Long Tasks Count",
        before: currentLongTaskSources.length - longTaskCountDelta,
        after: currentLongTaskSources.length,
        delta: `+${longTaskCountDelta}`,
      });
    }

    // Add TBT/INP metric
    if (metricName === "tbt") {
      evidence.push({
        type: "metric",
        label: "Total Blocking Time (TBT)",
        before: baselineRun.tbt || 0,
        after: currentRun.tbt || 0,
        delta: `+${((currentRun.tbt || 0) - (baselineRun.tbt || 0)).toFixed(0)} ms`,
      });
    } else if (metricName === "inp") {
      evidence.push({
        type: "metric",
        label: "Interaction to Next Paint (INP)",
        before: baselineRun.inp || 0,
        after: currentRun.inp || 0,
        delta: `+${((currentRun.inp || 0) - (baselineRun.inp || 0)).toFixed(0)} ms`,
      });
    }

    // Add main thread breakdown by category
    const breakdown = ["scriptEvaluation", "styleLayout", "paintCompositeRender", "parseHTML"];
    breakdown.forEach((group) => {
      const current = currentMainThreadSources.find((s) => s.group === group);
      if (current && current.duration && current.duration > 100) {
        evidence.push({
          type: "insight",
          label: current.groupLabel || group,
          before: "-",
          after: `${current.duration.toFixed(0)} ms`,
          delta: "-",
        });
      }
    });

    return {
      id: "main-thread",
      title: "Main Thread Contention Increased",
      description: `Main thread work increased significantly, with more long tasks blocking user interactions. This causes ${metricName.toUpperCase()} to regress and delays responsiveness.`,
      confidence,
      estimatedImpact: totalMainThreadTimeDelta,
      evidence,
      recommendations: [
        "Break up long tasks into smaller chunks",
        "Use web workers for CPU-intensive operations",
        "Defer non-critical JavaScript execution",
        "Optimize render and layout operations",
        "Use requestIdleCallback for low-priority work",
        "Review recent code changes that may be CPU-intensive",
      ],
    };
  },
};

export default mainThreadRule;
