export const AnalyticsEvent = {
  site_add: "site_add",
  monitor_add: "monitor_add",
} as const;

type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
