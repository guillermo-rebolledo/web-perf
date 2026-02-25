import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIME_PERIODS, type TimePeriodValue } from "@/lib/alert-utils";
import {
  AlertCard,
  type RegressionAlertWithDetails,
} from "@/components/alert-card";
import { EmptyAlerts } from "@/components/empty-alerts";
import { Button } from "@/components/ui/button";

async function getAlertsForPeriod(
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
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
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

  // Fetch alerts for all time periods in parallel
  const [alerts1d, alerts3d, alerts5d, alerts10d, alerts30d] =
    await Promise.all([
      getAlertsForPeriod(session.user.id, 1, severityFilter),
      getAlertsForPeriod(session.user.id, 3, severityFilter),
      getAlertsForPeriod(session.user.id, 5, severityFilter),
      getAlertsForPeriod(session.user.id, 10, severityFilter),
      getAlertsForPeriod(session.user.id, 30, severityFilter),
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
  const [allAlerts30d] = await Promise.all([
    getAlertsForPeriod(session.user.id, 30),
  ]);

  const totalAlerts = allAlerts30d.length;
  const criticalCount = allAlerts30d.filter(
    (a) => a.severity === "critical",
  ).length;
  const openCount = allAlerts30d.filter((a) => a.status === "open").length;

  return (
    <div className="container mx-auto py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold font-inter tracking-tighter">
            Regression Alerts
          </h1>
          <p className="text-muted-foreground font-inter tracking-tighter -mt-2">
            Performance regressions detected across your monitored sites
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/alerts">
          <Card className="border-0 border-l-4 border-primary/50 hover:border-primary/70 focus:border-primary/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Alerts (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAlerts}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/alerts?severity=critical">
          <Card className="border-0 border-l-4 border-destructive/50 hover:border-destructive/70 focus:border-destructive/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {criticalCount}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card className="border-0 border-l-4 border-orange-500/50 hover:border-orange-500/70 focus:border-orange-500/70 select-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {openCount}
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
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          {TIME_PERIODS.map((period) => (
            <TabsTrigger key={period.value} value={period.value}>
              {period.label}
            </TabsTrigger>
          ))}
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
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
                    <TrendingUp className="h-4 w-4" />
                    <span className="tracking-tighter">
                      {alerts.length} alert{alerts.length !== 1 ? "s" : ""} in
                      the last {period.days} day{period.days > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {alerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
