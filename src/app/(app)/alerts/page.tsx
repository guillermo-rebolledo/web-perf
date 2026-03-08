import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CalendarDays,
  CircleDot,
  CircleOff,
  CircleCheck,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIME_PERIODS, type TimePeriodValue } from "@/lib/alert-utils";
import { type RegressionAlertWithDetails } from "@/components/alert-card";
import { EmptyAlerts } from "@/components/empty-alerts";
import { Button } from "@/components/ui/button";
import { AlertsList } from "@/components/alerts-list";
import { AlertsDatePicker } from "@/components/alerts-date-picker";

const INITIAL_LOAD_LIMIT = 20;

async function getInitialAlertsForPeriod(
  userId: string,
  days: number,
  severity?: string,
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await prisma.regressionAlert.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
      ...(severity && { severity }),
      run: {
        monitor: {
          site: {
            userId,
          },
        },
      },
    },
    include: {
      run: {
        include: {
          monitor: {
            include: {
              site: true,
            },
          },
        },
      },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: INITIAL_LOAD_LIMIT,
  });
}

async function getAlertsCount(userId: string, days: number, severity?: string) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await prisma.regressionAlert.count({
    where: {
      createdAt: {
        gte: startDate,
      },
      ...(severity && { severity }),
      run: {
        monitor: {
          site: {
            userId,
          },
        },
      },
    },
  });
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const severityFilter = params.severity;

  // Fetch initial alerts for all time periods in parallel
  const [alerts1d, alerts3d, alerts5d, alerts10d, alerts30d] =
    await Promise.all([
      getInitialAlertsForPeriod(session.user.id, 1, severityFilter),
      getInitialAlertsForPeriod(session.user.id, 3, severityFilter),
      getInitialAlertsForPeriod(session.user.id, 5, severityFilter),
      getInitialAlertsForPeriod(session.user.id, 10, severityFilter),
      getInitialAlertsForPeriod(session.user.id, 30, severityFilter),
    ]);

  const alertsByPeriod: Record<TimePeriodValue, RegressionAlertWithDetails[]> =
    {
      "1": alerts1d,
      "3": alerts3d,
      "5": alerts5d,
      "10": alerts10d,
      "30": alerts30d,
    };

  // Get counts from unfiltered 30d data for stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const statusWhere = (status: string) => ({
    createdAt: { gte: thirtyDaysAgo },
    status,
    run: { monitor: { site: { userId: session.user.id } } },
  });

  const [
    totalAlerts,
    criticalCount,
    openCount,
    acknowledgedCount,
    resolvedCount,
  ] = await Promise.all([
    getAlertsCount(session.user.id, 30),
    prisma.regressionAlert.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        severity: "critical",
        run: { monitor: { site: { userId: session.user.id } } },
      },
    }),
    prisma.regressionAlert.count({ where: statusWhere("open") }),
    prisma.regressionAlert.count({ where: statusWhere("acknowledged") }),
    prisma.regressionAlert.count({ where: statusWhere("resolved") }),
  ]);

  return (
    <div className="container mx-auto py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold font-sans tracking-tighter">
            Regression Alerts
          </h1>
          <p className="text-muted-foreground font-sans tracking-tight -mt-2">
            Performance regressions detected across your monitored sites &mdash; alerts are kept for{" "}
            <span className="font-medium text-foreground">{env.RUN_RETENTION_DAYS} days</span>.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Link
          href="/alerts"
          aria-label={`Total alerts: ${totalAlerts}`}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="group border-0 border-l-4 border-primary/40 hover:border-primary transition-colors shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Alerts (30d)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between w-full">
              <div className="text-3xl font-bold">{totalAlerts}</div>
              <Eye className="size-4 hidden group-hover:block group-focus:block" />
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/alerts?severity=critical"
          aria-label={`Critical alerts: ${criticalCount}`}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="group border-0 border-l-4 border-destructive/40 hover:border-destructive transition-colors shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between w-full">
              <div className="text-3xl font-bold text-destructive">
                {criticalCount}
              </div>
              <Eye className="size-4 hidden group-hover:block group-focus:block" />
            </CardContent>
          </Card>
        </Link>
        <Card className="border-0 border-l-4 border-muted/60 shadow-sm select-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5" />
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openCount}</div>
          </CardContent>
        </Card>
        <Card className="border-0 border-l-4 border-score-warning/40 shadow-sm select-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CircleOff className="h-3.5 w-3.5 text-score-warning" />
              Acknowledged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-score-warning">
              {acknowledgedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 border-l-4 border-green-500/40 shadow-sm select-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CircleCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {resolvedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Indicator */}
      {severityFilter === "critical" && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive tracking-tighter">
                Showing critical alerts only
              </span>
            </div>
            <Link href="/alerts">
              <Button variant="outline">Clear filter</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Time Period Tabs */}
      <Tabs defaultValue="1" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-6">
          {TIME_PERIODS.map((period) => (
            <TabsTrigger key={period.value} value={period.value}>
              {period.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="date" className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Pick Date
          </TabsTrigger>
        </TabsList>

        {TIME_PERIODS.map((period) => {
          const alerts = alertsByPeriod[period.value];
          return (
            <TabsContent
              key={period.value}
              value={period.value}
              className="mt-6"
            >
              {alerts.length === 0 ? (
                <EmptyAlerts days={period.days} />
              ) : (
                <AlertsList
                  initialAlerts={alerts}
                  days={period.days}
                  severity={severityFilter}
                />
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="date" className="mt-6">
          <AlertsDatePicker />
        </TabsContent>
      </Tabs>
    </div>
  );
}
