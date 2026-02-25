import type React from "react";
import type { BadgeProps } from "@/components/ui/badge";
import { AlertTriangle, BadgeInfo, CircleAlert } from "lucide-react";

// Type-safe severity and confidence levels
export type SeverityLevel = "critical" | "moderate" | "minor";
export type ConfidenceLevel = "high" | "medium" | "low";
export type TimePeriodValue = "1" | "3" | "5" | "10" | "30";

// Time period configuration
export interface TimePeriod {
  label: string;
  value: TimePeriodValue;
  days: number;
}

export const TIME_PERIODS: readonly TimePeriod[] = [
  { label: "1 Day", value: "1", days: 1 },
  { label: "3 Days", value: "3", days: 3 },
  { label: "5 Days", value: "5", days: 5 },
  { label: "10 Days", value: "10", days: 10 },
  { label: "30 Days", value: "30", days: 30 },
] as const;

// Severity configuration (uses Badge variants for consistent styling)
export interface SeverityInfo {
  label: string;
  variant: BadgeProps["variant"];
  cardClassName: string;
  iconClassName: string;
  borderClassName: string;
  icon: React.ReactNode;
}

export const severityConfig: Record<SeverityLevel, SeverityInfo> = {
  critical: {
    label: "Critical",
    variant: "destructive",
    cardClassName: "border-destructive/50 bg-destructive/5",
    iconClassName: "text-destructive",
    borderClassName:
      "border-l-4 border-destructive/50 hover:border-destructive/70 focus:border-destructive/70",
    icon: (
      <span className="text-destructive bg-destructive/10 p-2 rounded">
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      </span>
    ),
  },
  moderate: {
    label: "Moderate",
    variant: "warning",
    cardClassName:
      "border-score-warning/50 bg-score-warning/5 dark:bg-score-warning/10",
    iconClassName: "text-score-warning",
    borderClassName:
      "border-l-4 border-score-warning/50 hover:border-score-warning/70 focus:border-score-warning/70",
    icon: (
      <span className="text-score-warning bg-score-warning/10 p-2 rounded">
        <CircleAlert className="h-5 w-5 shrink-0 text-score-warning" />
      </span>
    ),
  },
  minor: {
    label: "Minor",
    variant: "warningMinor",
    cardClassName:
      "border-score-warning/40 bg-score-warning/10 dark:bg-score-warning/5",
    iconClassName: "text-score-warning",
    borderClassName:
      "border-l-4 border-score-warning/40 hover:border-score-warning/60 focus:border-score-warning/60",
    icon: (
      <span className="text-score-warning bg-score-warning/10 p-2 rounded">
        <BadgeInfo className="h-5 w-5 shrink-0 text-score-warning" />
      </span>
    ),
  },
};

interface ConfidenceInfo {
  label: string;
  variant: BadgeProps["variant"];
}

export const confidenceConfig: Record<ConfidenceLevel, ConfidenceInfo> = {
  high: {
    label: "High",
    variant: "success",
  },
  medium: {
    label: "Medium",
    variant: "warningMinor",
  },
  low: {
    label: "Low",
    variant: "outline",
  },
};

// Helper functions for metric formatting
export function formatMetricValue(value: number, metricName: string): string {
  if (metricName === "cls") return value.toFixed(3);
  return Math.round(value).toString();
}

export function getMetricUnit(metricName: string): string {
  if (metricName === "cls") return "";
  return "ms";
}

// Type guards for runtime validation
export function isSeverityLevel(value: string): value is SeverityLevel {
  return ["critical", "moderate", "minor"].includes(value);
}

export function isConfidenceLevel(value: string): value is ConfidenceLevel {
  return ["high", "medium", "low"].includes(value);
}

// Safe getters with fallbacks
export function getSeverityInfo(severity: string): SeverityInfo {
  if (isSeverityLevel(severity)) {
    return severityConfig[severity];
  }

  // Fallback: use minor config but with a neutral outline badge
  return { ...severityConfig.minor, variant: "outline" };
}

export function getConfidenceInfo(confidence: string): ConfidenceInfo {
  return isConfidenceLevel(confidence)
    ? confidenceConfig[confidence]
    : confidenceConfig.low; // fallback
}

// Types for regression alert JSON fields
export interface RegressionCause {
  id: string;
  title: string;
  description: string;
  confidence: number;
  estimatedImpact: number;
  evidence: Array<{
    type: "metric" | "audit" | "resource" | "insight";
    label: string;
    before: string | number;
    after: string | number;
    delta: string | number;
  }>;
  recommendations: string[];
}

export interface DiffSummary {
  network: {
    totalBytesDelta: number;
    requestCountDelta: number;
    imageBytesDelta: number;
    jsBytesDelta: number;
    cssBytesDelta: number;
    fontBytesDelta: number;
    thirdPartyBytesDelta: number;
    newDomains: string[];
    removedDomains: string[];
  };
  mainThread: {
    scriptingTimeDelta: number;
    renderingTimeDelta: number;
    longTaskCountDelta: number;
    totalMainThreadTimeDelta: number;
  };
  rendering: {
    lcpResourceChanged: boolean;
    lcpResourceBefore: string;
    lcpResourceAfter: string;
    clsShiftSourcesChanged: boolean;
  };
  backend: {
    ttfbDelta: number;
    serverLatencyDelta: number;
  };
}

// JSON parsing helpers for Prisma JsonValue fields
export function parseRegressionCauses(json: unknown): RegressionCause[] {
  if (!json || !Array.isArray(json)) return [];
  return json as RegressionCause[];
}

export function parseDiffSummary(json: unknown): DiffSummary | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return json as DiffSummary;
}
