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
import { ScoreBadge, MetricBadge } from "@/components/score-badge";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";

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

  const run = await prisma.run.findFirst({
    where: {
      id,
    },
    include: {
      monitor: {
        include: {
          site: true,
          runs: {
            where: {
              status: "success",
              completedAt: {
                lt: new Date(),
              },
            },
            orderBy: {
              completedAt: "desc",
            },
            take: 1,
            skip: 0,
          },
        },
      },
      audits: {
        orderBy: {
          score: "asc",
        },
      },
    },
  });

  if (!run || run.monitor.site.userId !== session.user.id) {
    notFound();
  }

  const previousRun = run.monitor.runs.find((r) => r.id !== run.id);
  const duration =
    run.startedAt && run.completedAt
      ? differenceInSeconds(new Date(run.completedAt), new Date(run.startedAt))
      : null;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href={`/sites/${run.monitor.siteId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Site
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold">Run Details</h1>
            <p className="text-muted-foreground">
              {run.monitor.site.name} •{" "}
              {run.monitor.strategy.charAt(0).toUpperCase() +
                run.monitor.strategy.slice(1)}
            </p>
          </div>
          {previousRun && run.status === "success" && (
            <Link href={`/runs/${previousRun.id}/compare/${run.id}`}>
              <Button variant="outline">Compare with Previous</Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Run Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          </dl>
        </CardContent>
      </Card>

      {run.status === "success" && (
        <>
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreBadge score={run.performanceScore} className="text-2xl" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Accessibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreBadge
                  score={run.accessibilityScore}
                  className="text-2xl"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreBadge
                  score={run.bestPracticesScore}
                  className="text-2xl"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">SEO</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreBadge score={run.seoScore} className="text-2xl" />
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>Key metrics for user experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-6">
                <MetricBadge
                  label="LCP"
                  value={run.lcp}
                  unit="ms"
                  thresholds={{ good: 2500, needsImprovement: 4000 }}
                />
                <MetricBadge
                  label="INP"
                  value={run.inp}
                  unit="ms"
                  thresholds={{ good: 200, needsImprovement: 500 }}
                />
                <MetricBadge
                  label="TBT"
                  value={run.tbt}
                  unit="ms"
                  thresholds={{ good: 200, needsImprovement: 600 }}
                />
                <MetricBadge
                  label="CLS"
                  value={run.cls}
                  unit=""
                  thresholds={{ good: 0.1, needsImprovement: 0.25 }}
                />
                <MetricBadge
                  label="FCP"
                  value={run.fcp}
                  unit="ms"
                  thresholds={{ good: 1800, needsImprovement: 3000 }}
                />
                <MetricBadge
                  label="TTFB"
                  value={run.ttfb}
                  unit="ms"
                  thresholds={{ good: 800, needsImprovement: 1800 }}
                />
              </div>
            </CardContent>
          </Card>

          {run.audits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Audits</CardTitle>
                <CardDescription>
                  Failed or warning audits from this run
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Audit</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.audits.map((audit, index) => (
                      <TableRow
                        key={audit.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <TableCell className="font-medium">
                          {audit.title}
                        </TableCell>
                        <TableCell>
                          {audit.score !== null ? (
                            <ScoreBadge score={audit.score * 100} />
                          ) : (
                            "N/A"
                          )}
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
