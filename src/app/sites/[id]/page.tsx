import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MonitorForm } from "@/components/monitor-form";
import { RunButton } from "@/components/run-button";
import { ScoreBadge } from "@/components/score-badge";
import { MetricsChart } from "@/components/metrics-chart";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function SitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const site = await prisma.site.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      monitors: {
        include: {
          runs: {
            where: {
              status: {
                in: ["success", "queued", "running"],
              },
            },
            orderBy: {
              queuedAt: "desc",
            },
            take: 30,
            include: {
              monitor: {
                select: {
                  strategy: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!site) {
    notFound();
  }

  const allRuns = site.monitors
    .flatMap((m) => m.runs)
    .filter((r) => r.status === "success")
    .sort(
      (a, b) =>
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
    );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{site.name}</h1>
            <p className="text-muted-foreground">{site.url}</p>
          </div>
          <MonitorForm siteId={site.id} />
        </div>
      </div>

      {allRuns.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>
              Last 30 successful runs across all monitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricsChart runs={allRuns} />
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">Monitors</h2>
        {site.monitors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                No monitors configured for this site
              </p>
              <MonitorForm
                siteId={site.id}
                triggerButton={<Button>Create First Monitor</Button>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {site.monitors.map((monitor) => {
              const recentRuns = monitor.runs.slice(0, 10);

              return (
                <Card key={monitor.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {monitor.strategy === "mobile" ? "📱" : "🖥️"}{" "}
                          {monitor.strategy.charAt(0).toUpperCase() +
                            monitor.strategy.slice(1)}{" "}
                          Monitor
                          {monitor.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Runs every {monitor.cadenceMinutes} minutes
                          {monitor.lastRunAt &&
                            ` • Last run ${formatDistanceToNow(
                              new Date(monitor.lastRunAt),
                              { addSuffix: true },
                            )}`}
                        </CardDescription>
                      </div>
                      <RunButton
                        monitorId={monitor.id}
                        activeRunId={
                          monitor.runs.find(
                            (r) => r.status === "queued" || r.status === "running"
                          )?.id
                        }
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentRuns.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No runs yet
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Performance</TableHead>
                            <TableHead>LCP</TableHead>
                            <TableHead>CLS</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentRuns.map((run, index) => (
                            <TableRow 
                              key={run.id}
                              className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}
                            >
                              <TableCell>
                                <Badge
                                  variant={
                                    run.status === "success"
                                      ? "success"
                                      : run.status === "failed"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {run.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <ScoreBadge score={run.performanceScore} />
                              </TableCell>
                              <TableCell>
                                {run.lcp ? `${Math.round(run.lcp)}ms` : "N/A"}
                              </TableCell>
                              <TableCell>
                                {run.cls ? run.cls.toFixed(3) : "N/A"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {run.completedAt
                                  ? formatDistanceToNow(
                                      new Date(run.completedAt),
                                      { addSuffix: true },
                                    )
                                  : formatDistanceToNow(
                                      new Date(run.queuedAt),
                                      { addSuffix: true },
                                    )}
                              </TableCell>
                              <TableCell>
                                {run.status === "success" && (
                                  <Link href={`/runs/${run.id}`}>
                                    <Button variant="ghost" size="sm">
                                      View Details
                                    </Button>
                                  </Link>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
