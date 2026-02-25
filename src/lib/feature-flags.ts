/**
 * Canonical feature flag keys. Import this in server components, API routes,
 * and client components to avoid magic strings everywhere.
 */
export const FEATURE_FLAGS = {
  RUN_AI_SUMMARY: "run_ai_summary",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
