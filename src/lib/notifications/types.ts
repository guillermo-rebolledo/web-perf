/** Shared types for the notification subsystem. */

export interface NotificationRun {
  id: string;
  monitorId: string;
  performanceScore: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
  finalUrl: string | null;
  completedAt: Date | null;
  monitor: {
    id: string;
    strategy: string;
    site: { name: string; url: string };
    userId: string;
  };
}

export interface NotificationRegression {
  metricName: string;
  severity: string;
  percentChange: number;
  baselineValue: number;
  actualValue: number;
}

export interface NotificationContext {
  run: NotificationRun;
  regressions: NotificationRegression[];
  appBaseUrl: string;
}

/** Discriminated union of integration configs — extend per provider. */
export type IntegrationConfig = {
  type: "slack";
  webhookUrl: string;
};
