/**
 * Shared API response types.
 * No Prisma or server imports — safe to use in CLI and browser code alike.
 */

// GET /api/sites
export interface SiteListItem {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  monitors: MonitorSummary[];
}

// GET /api/monitors
export interface MonitorSummary {
  id: string;
  siteId: string;
  strategy: "mobile" | "desktop";
  cadenceMinutes: number;
  isActive: boolean;
  nextRunAt: string;
  createdAt: string;
}

// POST /api/monitors/[id]/run
export interface RunTriggerResult {
  runId: string;
  jobId: string;
  remaining: number;
}

// GET /api/runs/[id]/status (polling)
export interface RunStatusResult {
  status: "queued" | "running" | "success" | "failed";
  errorMessage: string | null;
}

// GET /api/runs/[id]
export interface RunSummary {
  id: string;
  monitorId: string;
  status: string;
  completedAt: string | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  finalUrl: string | null;
  monitor: { id: string; strategy: string; site: { name: string; url: string } };
}

// GET /api/runs/[id]/regressions
export interface RegressionAlert {
  id: string;
  metricName: string;
  severity: "minor" | "moderate" | "critical";
  confidence: "low" | "medium" | "high";
  percentChange: number;
  baselineValue: number;
  actualValue: number;
}

export interface RunRegressionsResult {
  alerts: RegressionAlert[];
}

// GET /api/keys
export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  userAgent: string | null;
}

export interface ApiKeysListResult {
  keys: ApiKeyItem[];
}

// POST /api/keys (response includes raw key — only returned once)
export interface ApiKeyCreateResult {
  key: ApiKeyItem;
  rawKey: string;
}

// CLI auth device flow
export interface CliLoginPending {
  loginCode: string;
  authorizeUrl: string;
  expiresInSeconds: number;
}

export interface CliLoginStatus {
  status: "pending" | "authorized" | "expired";
  apiKey?: string;
  email?: string;
}

// GET /api/integrations
export interface IntegrationItem {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  monitorCount: number;
  createdAt: string;
}

export interface MonitorOption {
  id: string;
  label: string;
}
