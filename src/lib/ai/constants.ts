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
