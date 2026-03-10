/**
 * Canonical feature flag keys. Import this in server components, API routes,
 * and client components to avoid magic strings everywhere.
 */
export const FEATURE_FLAGS = {
  RUN_AI_SUMMARY: "run_ai_summary",
  PATTERN_INSIGHT: "pattern_insight",  // Cross-run regression pattern analysis
  HEALTH_REPORT: "health_report",      // First-run site health report
} as const;
