import { Prisma } from "@prisma/client";

// Infer types from Prisma queries
export type SiteWithMonitorsAndRuns = Prisma.SiteGetPayload<{
  include: {
    monitors: {
      include: {
        runs: {
          where: {
            status: "success";
          };
          orderBy: {
            completedAt: "desc";
          };
          take: 1;
        };
      };
    };
  };
}>;

export type SiteWithFullDetails = Prisma.SiteGetPayload<{
  include: {
    monitors: {
      include: {
        runs: {
          where: {
            status: {
              in: ["success", "queued", "running"];
            };
          };
          orderBy: {
            queuedAt: "desc";
          };
          take: 30;
        };
      };
    };
  };
}>;

export type RunWithDetails = Prisma.RunGetPayload<{
  include: {
    monitor: {
      include: {
        site: true;
        runs: {
          where: {
            status: "success";
            completedAt: {
              lt: Date;
            };
          };
          orderBy: {
            completedAt: "desc";
          };
          take: 1;
        };
      };
    };
    audits: true;
    insights: true;
  };
}>;

export type RunWithAudits = Prisma.RunGetPayload<{
  include: {
    audits: true;
    insights: true;
  };
}>;

/** Audit shape for run detail page */
export interface RunPageAudit {
  id: string;
  title: string;
  score: number | null;
  displayValue: string | null;
}

/** Metric name → savings in ms (from PageSpeed Insights) */
export type MetricSavings = Record<string, number>;

/** Insight shape for run detail page */
export interface RunPageInsight {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue: string | null;
  metricSavings: MetricSavings | null;
}

/** Run scalar fields used on run detail page (matches Prisma Run model) */
interface RunPageScalars {
  id: string;
  monitorId: string;
  status: string;
  jobId: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcp: number | null;
  inp: number | null;
  tbt: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  lighthouseVersion: string | null;
  finalUrl: string | null;
  runWarnings: string[];
  speedIndex: number | null;
  tti: number | null;
  totalByteWeight: number | null;
  numRequests: number | null;
  mainThreadWork: number | null;
  screenshotData: string | null;
}

/** Run with monitor (and site), audits, and insights — for run detail page */
export type RunForPage = RunPageScalars & {
  monitor: Prisma.MonitorGetPayload<{ include: { site: true } }>;
  audits: RunPageAudit[];
  insights: RunPageInsight[];
};

export type MonitorWithSiteAndRuns = Prisma.MonitorGetPayload<{
  include: {
    site: true;
    runs: {
      where: {
        status: {
          in: ["queued", "running"];
        };
      };
      take: 1;
    };
  };
}>;
