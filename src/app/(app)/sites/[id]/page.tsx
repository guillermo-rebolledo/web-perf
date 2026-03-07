import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GitHubIntegrationPanel } from "@/components/github-integration-panel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Skeleton } from "@/components/ui/skeleton";
import { MonitorForm } from "@/components/monitor-form";
import { RunButton } from "@/components/run-button";
import { RunStatusBadge } from "@/components/run-status-badge";
import { RunStatus } from "@/types/prisma";
import { ScoreBadge } from "@/components/score-badge";
import { MetricsChart } from "@/components/metrics-chart";
import { formatDistanceToNow } from "date-fns";
import { EmptyMonitors } from "@/components/empty-monitors";
import { ScheduledQuotaWarning } from "@/components/scheduled-quota-warning";
import { formatCadence } from "@/lib/dates";
import {
  Activity,
  Clock,
  GitBranch,
  History,
  Monitor as MonitorIcon,
  Rocket,
  Smartphone,
} from "lucide-react";

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
    .filter((r) => r.status === RunStatus.success)
    .sort(
      (a, b) =>
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
    );

  return (
    <div className="container mx-auto py-8">
      <ScheduledQuotaWarning />
      <div className="flex flex-col gap-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Site</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold font-inter tracking-tighter">
              Monitors
            </h2>
            <p className="text-muted-foreground tracking-tighter text-sm">
              Historical trends and score comparison for
              <Link
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="pl-[3px] hover:underline focus:underline underline-offset-2 hover:opacity-90 focus:opacity-90"
              >
                {site.url}
              </Link>
              .
            </p>
          </div>
          <MonitorForm siteId={site.id} baseUrl={env.NEXTAUTH_URL} />
        </div>

        {allRuns.length > 0 && (
          <Card>
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

        <div className="min-w-0">
          {site.monitors.length === 0 ? (
            <EmptyMonitors siteId={site.id} />
          ) : (
            <div className="grid min-w-0 gap-6">
              {site.monitors.map((monitor) => {
                const recentRuns = monitor.runs.slice(0, 10);

                return (
                  <Card key={monitor.id} className="min-w-0">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                      <div className="min-w-0">
                        <CardTitle className="flex flex-wrap items-center gap-2">
                          {monitor.isActive ? (
                            <Badge variant="success" className="uppercase">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="uppercase">
                              Inactive
                            </Badge>
                          )}
                          <span className="flex items-center gap-1.5 capitalize">
                            {monitor.strategy === "mobile" ? (
                              <Smartphone className="size-4 text-muted-foreground" />
                            ) : (
                              <MonitorIcon className="size-4 text-muted-foreground" />
                            )}
                            {monitor.strategy} Monitor
                          </span>
                          {monitor.triggerType === "deployment" && monitor.githubBranch && (
                            <Badge variant="outline" className="gap-1 font-mono text-xs font-normal">
                              <GitBranch className="size-3" />
                              {monitor.githubBranch}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {monitor.triggerType === "deployment" ? (
                            <span className="flex items-center gap-1.5">
                              <Rocket className="size-3.5 shrink-0" />
                              Runs on deployment
                            </span>
                          ) : (
                            <>Runs every {formatCadence(monitor.cadenceMinutes)}</>
                          )}
                        </CardDescription>
                        {/* Metadata chips */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {monitor.lastRunAt && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <History className="size-3 shrink-0" />
                              Last run{" "}
                              {formatDistanceToNow(new Date(monitor.lastRunAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                          {monitor.triggerType === "schedule" && monitor.isActive && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="size-3 shrink-0" />
                              Next run{" "}
                              {formatDistanceToNow(new Date(monitor.nextRunAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                          {(() => {
                            const successCount = monitor.runs.filter(
                              (r) => r.status === RunStatus.success,
                            ).length;
                            return successCount > 0 ? (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Activity className="size-3 shrink-0" />
                                {successCount} successful{" "}
                                {successCount === 1 ? "run" : "runs"}
                              </span>
                            ) : null;
                          })()}
                          {monitor.triggerType === "deployment" && monitor.githubRepo && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                              <GitBranch className="size-3 shrink-0" />
                              {monitor.githubRepo}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {monitor.triggerType === "deployment" && (
                          <GitHubIntegrationPanel
                            monitorId={monitor.id}
                            baseUrl={env.NEXTAUTH_URL}
                            initialRepo={monitor.githubRepo}
                            initialBranch={monitor.githubBranch}
                          />
                        )}
                        {monitor.triggerType !== "deployment" && (
                          <RunButton
                            monitorId={monitor.id}
                            activeRunId={
                              monitor.runs.find(
                                (r) =>
                                  r.status === RunStatus.queued || r.status === RunStatus.running,
                              )?.id
                            }
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="min-w-0 overflow-hidden p-0!">
                      {recentRuns.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            {monitor.triggerType === "deployment"
                              ? "Waiting for your first deployment"
                              : "No runs yet"}
                          </p>
                          {monitor.triggerType === "deployment" && (
                            <p className="mt-1 text-xs text-muted-foreground/70">
                              Results will appear here after a successful deployment triggers this monitor.
                            </p>
                          )}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>Performance</TableHead>
                              <TableHead>Accessibility</TableHead>
                              <TableHead>Best Practices</TableHead>
                              <TableHead>SEO</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentRuns.map((run) => {
                              const isPending =
                                run.status === RunStatus.queued ||
                                run.status === RunStatus.running;
                              if (isPending) {
                                return (
                                  <TableRow key={run.id}>
                                    <TableCell>
                                      <RunStatusBadge
                                        status={run.status as RunStatus}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Skeleton className="h-6 w-12" />
                                    </TableCell>
                                    <TableCell>
                                      <Skeleton className="h-6 w-12" />
                                    </TableCell>
                                    <TableCell>
                                      <Skeleton className="h-6 w-12" />
                                    </TableCell>
                                    <TableCell>
                                      <Skeleton className="h-6 w-12" />
                                    </TableCell>
                                    <TableCell>
                                      <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                    <TableCell>
                                      <Skeleton className="h-8 w-24" />
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                              return (
                                <TableRow key={run.id}>
                                  <TableCell>
                                    <RunStatusBadge
                                      status={run.status as RunStatus}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <ScoreBadge score={run.performanceScore} />
                                  </TableCell>
                                  <TableCell>
                                    <ScoreBadge
                                      score={run.accessibilityScore}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <ScoreBadge
                                      score={run.bestPracticesScore}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <ScoreBadge score={run.seoScore} />
                                  </TableCell>
                                  <TableCell className="capitalize text-muted-foreground tracking-tighter text-xs">
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
                                    {run.status === RunStatus.success && (
                                      <Link href={`/runs/${run.id}`}>
                                        <Button size="sm" variant="muted">
                                          View Details
                                        </Button>
                                      </Link>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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
    </div>
  );
}
