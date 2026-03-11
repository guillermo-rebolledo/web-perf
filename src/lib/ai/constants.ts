/** Shared constants for the AI run summary feature. */

export const AI_SUMMARY = {
  /** OpenAI model used for analysis. */
  MODEL: "gpt-4o-mini",

  /** Redis key prefix for the per-user daily rate limit. */
  RATE_LIMIT_KEY: "ai-summary",

  /** Maximum number of AI analyses a user can generate per day. */
  DAILY_LIMIT: 5,

  /** Minimum minutes between regenerations for the same run. */
  COOLDOWN_MINUTES: 60,

  /** API error codes returned by the route (and parsed client-side). */
  ERROR_CODES: {
    COOLDOWN: "cooldown",
    DAILY_LIMIT: "daily_limit",
  },
} as const;

export type AiSummaryErrorCode =
  (typeof AI_SUMMARY.ERROR_CODES)[keyof typeof AI_SUMMARY.ERROR_CODES];

/** Shared constants for the cross-run regression pattern analysis feature. */
export const PATTERN_INSIGHT = {
  /** OpenAI model used for analysis. */
  MODEL: "gpt-4o-mini",

  /** Minimum number of regression alerts required before generating an insight. */
  MIN_REGRESSIONS: 3,

  /** Rolling window (days) to look back when querying regression alerts. */
  LOOKBACK_DAYS: 90,

  /** Regenerate if the cached insight is older than this many hours. */
  STALENESS_HOURS: 24,

  /**
   * Redis SETNX lock TTL (seconds). Prevents concurrent generation for the
   * same monitor when two requests arrive simultaneously.
   */
  GENERATION_LOCK_TTL_SECONDS: 120,

  /** Max GET requests to the pattern-insights endpoint per user per day. */
  API_DAILY_LIMIT: 30,

  /** Max LLM generation calls per user per day (across all monitors). */
  GENERATION_DAILY_LIMIT: 5,

  /** Redis key prefix for the per-user API rate limit. */
  RATE_LIMIT_KEY: "pattern-insight",

  /** Redis key prefix for the per-user generation rate limit. */
  RATE_LIMIT_GEN_KEY: "pattern-insight-gen",
} as const;

/** Shared constants for the per-alert AI fix-it code suggestions feature. */
export const FIX_IT_SUGGESTIONS = {
  /** OpenAI model used for fix generation. */
  MODEL: "gpt-4o-mini",

  /** Redis key prefix for the per-user daily rate limit. */
  RATE_LIMIT_KEY: "fix-it-suggestions",

  /** Maximum number of fix-it generations a user can trigger per day. */
  DAILY_LIMIT: 5,

  /** Minimum minutes between regenerations for the same alert. */
  COOLDOWN_MINUTES: 60,

  /** API error codes returned by the route (and parsed client-side). */
  ERROR_CODES: {
    COOLDOWN: "cooldown",
    DAILY_LIMIT: "daily_limit",
  },
} as const;

export type FixItSuggestionsErrorCode =
  (typeof FIX_IT_SUGGESTIONS.ERROR_CODES)[keyof typeof FIX_IT_SUGGESTIONS.ERROR_CODES];

/** Shared constants for the first-run site health report feature. */
export const HEALTH_REPORT = {
  /** OpenAI model used for health report generation. */
  MODEL: "gpt-4o-mini",

  /** Max health reports a user can generate per day (across all monitors). */
  DAILY_LIMIT: 5,

  /** Redis key prefix for the per-user daily limit. */
  RATE_LIMIT_KEY: "health-report",
} as const;
