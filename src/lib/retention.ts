/**
 * Default retention window for completed Run rows (and their cascade children:
 * Audit, Insight, RegressionAlert). Used in env.js, data-retention.ts, and
 * any client component that needs a fallback when the prop is omitted.
 */
export const DEFAULT_RUN_RETENTION_DAYS = 90;

/**
 * Default retention window for ActivityEvent rows.
 * Older entries are deleted nightly by the scheduler.
 */
export const DEFAULT_ACTIVITY_RETENTION_DAYS = 30;
