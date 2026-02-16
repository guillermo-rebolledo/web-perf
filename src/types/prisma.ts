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
  };
}>;

export type RunWithAudits = Prisma.RunGetPayload<{
  include: {
    audits: true;
  };
}>;

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
