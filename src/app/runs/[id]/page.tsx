import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RunForPage } from "@/types/prisma";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ScoreBadge, MetricBadge } from "@/components/score-badge";
import { ScoreStatCard } from "@/components/score-stat-card";
import { Badge } from "@/components/ui/badge";
import { GitCompare } from "lucide-react";
import { formatRelativeTime } from "@/lib/dates";
import { getThresholds } from "@/lib/metric-thresholds";
import { DescriptionWithParsedLink } from "@/components/description-with-parsed-link";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const run = (await prisma.run.findFirst({
    where: { id },
    include: {
      monitor: { include: { site: true } },
      audits: { orderBy: { score: "asc" } },
      insights: { orderBy: { score: "asc" } },
    },
  } as never)) as RunForPage | null;

  if (!run || run.monitor.site.userId !== session.user.id) {
    notFound();
  }

  // Only look for runs completed *before* this one so the first-ever run
  // doesn't incorrectly show a "Compare with Previous" button.
  const previousRun = run.completedAt
    ? await prisma.run.findFirst({
        where: {
          monitorId: run.monitorId,
          id: { not: id },
          status: "success",
          completedAt: { not: null, lt: run.completedAt },
        },
        orderBy: {
          completedAt: "desc",
        },
        select: { id: true },
      })
    : null;

  const strategy = run.monitor.strategy === "desktop" ? "desktop" : "mobile";
  const t = getThresholds(strategy);

  return (
    <div className="container mx-auto py-8 flex flex-col gap-8">
      <div className="flex flex-col gap-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/sites/${run.monitor.siteId}`}>
                {run.monitor.site.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Run Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            {run.status === "success" && (
              <div className="flex items-center gap-2">
                <span className="bg-green-100 border border-green-200 text-green-500 font-semibold rounded w-fit px-2 py-1 text-xs uppercase">
                  Analysis Complete
                </span>

                {run.completedAt && (
                  <span className="text-xs text-muted-foreground tracking-tighter">
                    {`Tested ${formatRelativeTime(run.completedAt)}`}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-col">
              <h2 className="text-3xl font-bold font-inter tracking-tighter">
                Run Details
              </h2>
              <p className="text-muted-foreground tracking-tighter text-sm">
                {`${run.monitor.site.name} • ${
                  run.monitor.strategy.charAt(0).toUpperCase() +
                  run.monitor.strategy.slice(1)
                }`}
              </p>
            </div>
          </div>
          {previousRun && run.status === "success" && (
            <Link href={`/runs/${previousRun.id}/compare/${run.id}`}>
              <Button>
                <GitCompare />
                Compare with Previous
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Run Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            <div className="flex flex-col gap-2">
              <dt className="text-lg font-geist-mono font-semibold tracking-tighter text-muted-foreground">
                Status
              </dt>
              <dd>
                <ScoreBadge
                  score={
                    run.status === "success"
                      ? 100
                      : run.status === "failed"
                        ? 0
                        : 50
                  }
                />
              </dd>
            </div>
            <div className="flex flex-col gap-2">
              <dt className="text-lg font-geist-mono font-semibold tracking-tighter text-muted-foreground">
                Queued
              </dt>
              <dd className="text-sm">
                {formatDistanceToNow(new Date(run.queuedAt), {
                  addSuffix: true,
                })}
              </dd>
            </div>
            <div className="flex flex-col gap-2">
              <dt className="text-lg font-geist-mono font-semibold tracking-tighter text-muted-foreground">
                Completed
              </dt>
              <dd className="text-sm">
                {run.completedAt
                  ? formatDistanceToNow(new Date(run.completedAt), {
                      addSuffix: true,
                    })
                  : "N/A"}
              </dd>
            </div>
            <div className="flex flex-col gap-2">
              <dt className="text-lg font-geist-mono font-semibold tracking-tighter text-muted-foreground">
                Duration
              </dt>
              <dd className="text-sm">{duration ? `${duration}s` : "N/A"}</dd>
            </div>
            {run.lighthouseVersion && (
              <div className="flex flex-col gap-2">
                <dt className="text-lg font-geist-mono font-semibold tracking-tighter text-muted-foreground">
                  Lighthouse
                </dt>
                <dd className="text-sm">v{run.lighthouseVersion}</dd>
              </div>
            )}
            {run.finalUrl && run.finalUrl !== run.monitor.site.url && (
              <div className="flex flex-col gap-2">
                <dt className="text-lg font-geist-mono font-semibold tracking-tighter text-muted-foreground">
                  Final URL
                </dt>
                <dd
                  className="text-sm truncate max-w-[200px]"
                  title={run.finalUrl}
                >
                  {run.finalUrl}
                </dd>
              </div>
            )}
            {run.screenshotData && (
              <div className="flex flex-col gap-2">
                <dt className="text-lg font-geist-mono font-semibold tracking-tighter text-muted-foreground">
                  Screenshot
                </dt>
                <dd>
                  <ScreenshotThumbnail
                    screenshotData={run.screenshotData}
                    siteName={run.monitor.site.name}
                    strategy={run.monitor.strategy}
                    compact
                  />
                </dd>
              </div>
            )}
          </dl>
          {run.runWarnings.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {run.runWarnings.map((warning: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card> */}

      {run.status === "success" && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreStatCard score={run.performanceScore} title="Performance" />
            <ScoreStatCard
              score={run.accessibilityScore}
              title="Accessibility"
            />
            <ScoreStatCard
              score={run.bestPracticesScore}
              title="Best Practices"
            />
            <ScoreStatCard score={run.seoScore} title="SEO" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>Key metrics for user experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-6">
                <MetricBadge
                  label="LCP"
                  description="Largest Contentful Paint"
                  value={run.lcp}
                  unit="ms"
                  thresholds={t.lcp}
                />
                <MetricBadge
                  label="INP"
                  description="Interaction to Next Paint"
                  value={run.inp}
                  unit="ms"
                  thresholds={t.inp}
                />
                <MetricBadge
                  label="TBT"
                  description="Total Blocking Time"
                  value={run.tbt}
                  unit="ms"
                  thresholds={t.tbt}
                />
                <MetricBadge
                  label="CLS"
                  description="Cumulative Layout Shift"
                  value={run.cls}
                  unit=""
                  thresholds={t.cls}
                />
                <MetricBadge
                  label="FCP"
                  description="First Contentful Paint"
                  value={run.fcp}
                  unit="ms"
                  thresholds={t.fcp}
                />
                <MetricBadge
                  label="TTFB"
                  description="Time to First Byte"
                  value={run.ttfb}
                  unit="ms"
                  thresholds={t.ttfb}
                />
              </div>
            </CardContent>
          </Card>

          {(run.speedIndex != null ||
            run.tti != null ||
            run.totalByteWeight != null ||
            run.numRequests != null ||
            run.mainThreadWork != null) && (
            <Card>
              <CardHeader>
                <CardTitle>Extra Metrics</CardTitle>
                <CardDescription>
                  Additional performance diagnostics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
                  <MetricBadge
                    label="Speed Index"
                    description="How quickly content is visually displayed"
                    value={run.speedIndex}
                    unit="ms"
                    thresholds={t.speedIndex}
                  />
                  <MetricBadge
                    label="TTI"
                    description="Time to Interactive"
                    value={run.tti}
                    unit="ms"
                    thresholds={t.tti}
                  />
                  <MetricBadge
                    label="Byte Weight"
                    description="Total page weight"
                    value={
                      run.totalByteWeight != null
                        ? Math.round(run.totalByteWeight / 1024)
                        : undefined
                    }
                    unit="KiB"
                    thresholds={t.byteWeight}
                  />
                  <MetricBadge
                    label="Requests"
                    description="Total network requests"
                    value={run.numRequests}
                    unit=""
                    thresholds={t.requests}
                  />
                  <MetricBadge
                    label="Main Thread"
                    description="Main thread work"
                    value={run.mainThreadWork}
                    unit="ms"
                    thresholds={t.mainThread}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {run.audits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Audits</CardTitle>
                <CardDescription>
                  Failed or warning audits from this run
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 overflow-hidden p-0!">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Audit</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.audits.map((audit, index) => (
                      <TableRow
                        key={audit.id}
                        className={
                          index % 2 === 0 ? "bg-background" : "bg-muted/50"
                        }
                      >
                        <TableCell className="font-medium">
                          {audit.title}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {audit.displayValue || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {run.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
                <CardDescription>
                  Actionable recommendations to improve performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {run.insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="flex flex-col gap-1.5 rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{insight.title}</span>
                        {insight.score !== null && (
                          <ScoreBadge score={insight.score * 100} />
                        )}
                        {insight.displayValue && (
                          <Badge variant="secondary" className="text-xs">
                            {insight.displayValue}
                          </Badge>
                        )}
                        {insight.metricSavings &&
                          typeof insight.metricSavings === "object" &&
                          !Array.isArray(insight.metricSavings) &&
                          Object.entries(insight.metricSavings)
                            .filter(
                              (entry): entry is [string, number] =>
                                typeof entry[1] === "number" && entry[1] > 0,
                            )
                            .map(([metric, value]) => (
                              <Badge
                                key={metric}
                                variant="outline"
                                className="text-xs"
                              >
                                {metric} −{value}ms
                              </Badge>
                            ))}
                      </div>
                      {insight.description && (
                        <DescriptionWithParsedLink
                          description={insight.description}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {run.status === "failed" && (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">
              {run.errorMessage || "Unknown error occurred"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
