/**
 * Run History page — /history
 *
 * Shows a time-series view of performance scores and Core Web Vitals for a
 * user-selected site + monitor pair over the last 7, 14, or 30 days.
 *
 * Architecture:
 *  - Server component: fetches the user's sites + monitors for the selectors,
 *    and loads the initial run dataset for the default monitor.
 *  - Passes data to <HistoryView> (client) which handles filter state and
 *    re-fetches via GET /api/runs when the user changes site, monitor, or range.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { redirect } from "next/navigation";
import { subDays } from "date-fns";
import { HistoryView } from "@/components/history-view";

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const sites = await prisma.site.findMany({
    where: { userId: session.user.id },
    include: {
      monitors: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const defaultSite = sites[0];
  const defaultMonitor = defaultSite?.monitors[0];

  const initialRuns = defaultMonitor
    ? await prisma.run.findMany({
        where: {
          monitorId: defaultMonitor.id,
          status: "success",
          completedAt: { gte: subDays(new Date(), 30) },
        },
        orderBy: { completedAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <div className="container mx-auto py-8 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-sans tracking-tighter">
          Run History
        </h1>
        <p className="text-muted-foreground font-sans tracking-tight">
          Performance scores and Core Web Vitals over time &mdash; runs are kept for{" "}
          <span className="font-medium text-foreground">{env.RUN_RETENTION_DAYS} days</span>.
        </p>
      </div>

      <HistoryView
        sites={sites}
        initialRuns={initialRuns}
        defaultSiteId={defaultSite?.id ?? null}
        defaultMonitorId={defaultMonitor?.id ?? null}
      />
    </div>
  );
}
