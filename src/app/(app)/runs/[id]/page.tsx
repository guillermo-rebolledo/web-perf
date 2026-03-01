import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RunForPage } from "@/types/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
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
import { ScoreBadge } from "@/components/score-badge";
import { RunStatus } from "@/types/prisma";
import { RunErrorMessage } from "@/components/run-error-message";
import {
  Accessibility,
  CircleCheck,
  Clock,
  ExternalLink,
  GitCompare,
  Lightbulb,
  MonitorCloud,
  Search,
  ShieldCheck,
  TabletSmartphone,
  Timer,
  Zap,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/dates";
import { getThresholds } from "@/lib/metric-thresholds";
import { DescriptionWithParsedLink } from "@/components/description-with-parsed-link";
import { cn, formatBytes } from "@/lib/utils";
import { extractFilename } from "@/lib/url-utils";
import { MetricCard } from "@/components/metric-card";
import { RegressionAlertCard } from "@/components/regression-alert-card";
import { RunAISummary } from "@/components/run-ai-summary";
import { Badge } from "@/components/ui/badge";
import { isFeatureEnabled } from "@/lib/posthog-server";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { differenceInSeconds } from "date-fns";
import {
  getScoreVariant,
  scoreVariantBgClass,
  scoreVariantClass,
} from "@/lib/score";
import { ElementType } from "react";

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
      regressionAlerts: { orderBy: { severity: "desc" } },
    },
  } as never)) as RunForPage | null;

  if (!run || run.monitor.site.userId !== session.user.id) {
    notFound();
  }

  // Only look for runs completed *before* this one so the first-ever run
  // doesn't incorrectly show a "Compare with Previous" button.
  const [previousRun, aiSummaryEnabled] = await Promise.all([
    run.completedAt
      ? prisma.run.findFirst({
          where: {
            monitorId: run.monitorId,
            id: { not: id },
            status: RunStatus.success,
            completedAt: { not: null, lt: run.completedAt },
          },
          orderBy: { completedAt: "desc" },
          select: { id: true },
        })
      : null,
    isFeatureEnabled(FEATURE_FLAGS.RUN_AI_SUMMARY, session.user.id),
  ]);

  const duration =
    run.startedAt && run.completedAt
      ? differenceInSeconds(new Date(run.completedAt), new Date(run.startedAt))
      : null;

  const strategy = run.monitor.strategy === "desktop" ? "desktop" : "mobile";
  const t = getThresholds(strategy);

  const isSuccess = run.status === RunStatus.success;
  const isFailed = run.status === RunStatus.failed;

  return (
    <div className="container mx-auto py-8 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
      </div>

      {/* Header card — always visible */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {isSuccess ? (
              <div className="shrink-0 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
                <CircleCheck className="text-emerald-600 dark:text-emerald-400 size-8" />
              </div>
            ) : null}
            <div className="flex flex-col flex-1">
              <h1 className="text-2xl font-bold tracking-tighter">
                Run Details
              </h1>

              <div className="flex flex-col md:flex-row md:items-center gap-2 pb-4">
                {run.completedAt ? (
                  <span className="text-muted-foreground tracking-tighter text-xs flex items-center gap-1 shrink-0 w-fit">
                    <Clock className="size-3" />
                    {`Completed ${formatRelativeTime(run.completedAt)}`}
                  </span>
                ) : null}
                {run.completedAt && run.finalUrl ? (
                  <span className="text-muted-foreground tracking-tighter text-xs hidden md:inline">
                    •
                  </span>
                ) : null}
                {run.finalUrl || run.monitor.site.url ? (
                  <a
                    href={run.finalUrl || run.monitor.site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground tracking-tighter text-xs flex items-center gap-1 hover:underline focus:underline shrink-0 w-fit"
                  >
                    <ExternalLink className="size-3" />
                    {run.finalUrl || run.monitor.site.url}
                  </a>
                ) : null}

                {previousRun && isSuccess && (
                  <Link
                    href={`/runs/${previousRun.id}/compare/${run.id}`}
                    className="text-primary tracking-tighter text-xs flex items-center gap-1 hover:underline focus:underline shrink-0 w-fit"
                  >
                    <GitCompare className="size-3" />
                    Compare with previous
                  </Link>
                )}
              </div>

              {isFailed && run.errorMessage ? (
                <RunErrorMessage
                  message={run.errorMessage}
                  siteHref={`/sites/${run.monitor.siteId}`}
                />
              ) : null}

              {isSuccess && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <div className="col-span-1 flex items-center gap-2">
                    <span className="bg-amber-500/10 text-amber-500 rounded p-2 shrink-0 w-fit self-start">
                      <Lightbulb className="size-6" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground tracking-tighter font-semibold text-xs">
                        Engine
                      </span>
                      <span className="text-foreground tracking-tighter font-semibold text-sm truncate capitalize">
                        {run.lighthouseVersion
                          ? `Lighthouse ${run.lighthouseVersion}`
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center gap-2">
                    <span className="bg-primary/10 text-primary rounded p-2 shrink-0 w-fit self-start">
                      {run.monitor.strategy === "desktop" ? (
                        <MonitorCloud className="size-6" />
                      ) : (
                        <TabletSmartphone className="size-6" />
                      )}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground tracking-tighter font-semibold text-xs">
                        Strategy
                      </span>
                      <span className="text-foreground tracking-tighter font-semibold text-sm truncate capitalize">
                        {strategy}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center gap-2">
                    <span className="bg-emerald-600/10 text-emerald-600 rounded p-2 shrink-0 w-fit self-start">
                      <Timer className="size-6" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground tracking-tighter font-semibold text-xs">
                        Duration
                      </span>
                      <span className="text-foreground tracking-tighter font-semibold text-sm truncate capitalize">
                        {duration ? `${duration}s` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          score={run.performanceScore}
          title="Performance"
          icon={Zap}
        />

        <ScoreCard
          score={run.accessibilityScore}
          title="Accessibility"
          icon={Accessibility}
        />

        <ScoreCard
          score={run.bestPracticesScore}
          title="Best Practices"
          icon={ShieldCheck}
        />

        <ScoreCard score={run.seoScore} title="SEO" icon={Search} />
      </section>

      {aiSummaryEnabled && (
        <RunAISummary
          runId={run.id}
          initialSummary={run.aiSummary}
          aiSummaryAt={run.aiSummaryAt}
          aiSummaryModel={run.aiSummaryModel}
        />
      )}

      {run.regressionAlerts && run.regressionAlerts.length > 0 && (
        <>
          <hr className="border-border spave-y-4" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col tracking-tighter">
                <h3 className="text-lg font-semibold leading-none">
                  Performance Regressions Detected
                </h3>
                <p className="text-sm text-muted-foreground">
                  {run.regressionAlerts.length} metric
                  {run.regressionAlerts.length > 1 ? "s" : ""} regressed
                  compared to baseline
                </p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {run.regressionAlerts.map((alert) => (
                <RegressionAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </>
      )}

      {isSuccess && (
        <>
          <hr className="border-border spave-y-4" />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col tracking-tighter">
              <h3 className="text-lg font-semibold leading-none">
                Core Web Vitals
              </h3>
              <p className="text-sm text-muted-foreground">
                Key metrics for user experience
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-4">
              <MetricCard
                title="LCP"
                subtitle="Largest Contentful Paint"
                value={run.lcp}
                unit="ms"
                thresholds={t.lcp}
              />
              <MetricCard
                title="INP"
                subtitle="Interaction to Next Paint"
                value={run.inp}
                unit="ms"
                thresholds={t.inp}
              />
              <MetricCard
                title="TBT"
                subtitle="Total Blocking Time"
                value={run.tbt}
                unit="ms"
                thresholds={t.tbt}
              />
              <MetricCard
                title="CLS"
                subtitle="Cumulative Layout Shift"
                value={run.cls}
                unit=""
                thresholds={t.cls}
              />
              <MetricCard
                title="FCP"
                subtitle="First Contentful Paint"
                value={run.fcp}
                unit="ms"
                thresholds={t.fcp}
              />
              <MetricCard
                title="TTFB"
                subtitle="Time to First Byte"
                value={run.ttfb}
                unit="ms"
                thresholds={t.ttfb}
              />
            </div>
          </div>
        </>
      )}

      {(run.speedIndex != null ||
        run.tti != null ||
        run.totalByteWeight != null ||
        run.numRequests != null ||
        run.mainThreadWork != null) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col tracking-tighter">
            <h3 className="text-lg font-semibold leading-none">
              Extra Metrics
            </h3>
            <p className="text-sm text-muted-foreground">
              Additional performance diagnostics
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              title="Speed Index"
              subtitle="How quickly content is visually displayed"
              value={run.speedIndex}
              unit="ms"
              thresholds={t.speedIndex}
            />
            <MetricCard
              title="TTI"
              subtitle="Time to Interactive"
              value={run.tti}
              unit="ms"
              thresholds={t.tti}
            />
            <MetricCard
              title="Byte Weight"
              subtitle="Total page weight"
              value={
                run.totalByteWeight != null
                  ? Math.round(run.totalByteWeight / 1024)
                  : null
              }
              unit="KiB"
              thresholds={t.byteWeight}
            />
            <MetricCard
              title="Requests"
              subtitle="Total network requests"
              value={run.numRequests}
              unit=""
              thresholds={t.requests}
            />
            <MetricCard
              title="Main Thread"
              subtitle="Main thread work"
              value={run.mainThreadWork}
              unit="ms"
              thresholds={t.mainThread}
            />
          </div>
        </div>
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
                    <TableCell>
                      <span className="flex items-center gap-2 tracking-tighter">
                        {audit.title}
                        {!audit.scored && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground"
                            title="This audit is a recommendation and does not affect your performance score"
                          >
                            Unscored
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tracking-tighter">
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
              {run.insights.map((insight) => {
                const sources = Array.isArray(insight.sources)
                  ? (insight.sources as Array<{
                      url: string;
                      totalBytes?: number;
                      wastedBytes?: number;
                      wastedMs?: number;
                      transferSize?: number;
                      depth?: number;
                    }>)
                  : [];
                const hasByteSources = sources.some(
                  (s) => s.wastedBytes != null,
                );
                const hasTimeSources = sources.some((s) => s.wastedMs != null);
                const isChainView = sources.some((s) => s.depth != null);

                return (
                  <div
                    key={insight.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{insight.title}</span>
                      {!insight.scored && (
                        <Badge
                          variant="outline"
                          title="This insight is a recommendation and does not affect your performance score"
                        >
                          Unscored
                        </Badge>
                      )}
                      {insight.score !== null && (
                        <ScoreBadge score={insight.score * 100} />
                      )}
                      {insight.displayValue && (
                        <Badge>{insight.displayValue}</Badge>
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
                    {sources.length > 0 && (
                      <div className="mt-2 overflow-x-auto rounded-md border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Resource</TableHead>
                              {isChainView && (
                                <TableHead className="text-right">
                                  Transfer Size
                                </TableHead>
                              )}
                              {hasByteSources && (
                                <>
                                  <TableHead className="text-right">
                                    Size
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Potential Savings
                                  </TableHead>
                                </>
                              )}
                              {hasTimeSources && (
                                <TableHead className="text-right">
                                  Wasted Time
                                </TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sources.map((source, idx) => (
                              <TableRow key={idx}>
                                <TableCell
                                  className="max-w-[300px] truncate font-geist-mono text-xs tracking-tighter"
                                  style={
                                    source.depth
                                      ? {
                                          paddingLeft: `${source.depth * 20 + 16}px`,
                                        }
                                      : undefined
                                  }
                                >
                                  {isChainView && source.depth ? (
                                    <span className="text-muted-foreground mr-1">
                                      {"└ "}
                                    </span>
                                  ) : null}
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
                                    title={source.url}
                                  >
                                    {extractFilename(source.url)}
                                  </a>
                                </TableCell>
                                {isChainView && (
                                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                                    {source.transferSize != null
                                      ? formatBytes(source.transferSize)
                                      : "—"}
                                  </TableCell>
                                )}
                                {hasByteSources && (
                                  <>
                                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                                      {source.totalBytes != null
                                        ? formatBytes(source.totalBytes)
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs tabular-nums">
                                      {source.wastedBytes != null ? (
                                        <span className="text-orange-600 dark:text-orange-400">
                                          {formatBytes(source.wastedBytes)}
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                  </>
                                )}
                                {hasTimeSources && (
                                  <TableCell className="text-right text-xs tabular-nums">
                                    {source.wastedMs != null ? (
                                      <span className="text-orange-600 dark:text-orange-400">
                                        {source.wastedMs.toFixed(2)} ms
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScoreCard({
  score,
  title,
  icon: Icon,
}: {
  score: number | null;
  title: string;
  icon?: ElementType;
}) {
  const variant = score !== null ? getScoreVariant(score) : "neutral";
  const scoreClassName = scoreVariantClass[variant];
  const bgClassName = scoreVariantBgClass[variant];

  const progress = score ?? 0;

  return (
    <Card className="col-span-1">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center min-w-0">
          <span className="uppercase text-xs text-muted-foreground font-semibold tracking-tighter">
            {title}
          </span>
          {Icon && <Icon className={cn(scoreClassName, "size-4")} />}
        </div>
        <span className="text-4xl font-extrabold tabular-nums text-foreground">
          {score ? Math.round(score) : "--"}
        </span>
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(bgClassName, "h-full rounded-full transition-all")}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
