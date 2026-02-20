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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { ScreenshotThumbnail } from "@/components/screenshot-thumbnail";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import {
  compareRuns,
  formatMetricValue,
  formatDelta,
  type MetricDelta,
} from "@/lib/metrics-compare";
import { format } from "date-fns";

function StatusBadge({ metric }: { metric: MetricDelta }) {
  if (metric.significance === "none") {
    return <Badge variant="neutral">No change</Badge>;
  }

  if (metric.significance === "minor") {
    return (
      <Badge
        variant={metric.isImprovement ? "successMinor" : "warningMinor"}
        className="gap-1"
      >
        {metric.isImprovement ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        Minor
      </Badge>
    );
  }

  // significance === "significant"
  return metric.isImprovement ? (
    <Badge variant="success" className="gap-1">
      <TrendingUp className="h-3 w-3" />
      Improved
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <TrendingDown className="h-3 w-3" />
      Regressed
    </Badge>
  );
}

export default async function CompareRunsPage({
  params,
}: {
  params: Promise<{ id: string; id2: string }>;
}) {
  const { id, id2 } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [run1, run2] = await Promise.all([
    prisma.run.findFirst({
      where: { id },
      include: {
        monitor: { include: { site: true } },
        audits: true,
      },
    }),
    prisma.run.findFirst({
      where: { id: id2 },
      include: {
        monitor: { include: { site: true } },
        audits: true,
      },
    }),
  ]);

  if (
    !run1 ||
    !run2 ||
    run1.monitor.site.userId !== session.user.id ||
    run2.monitor.site.userId !== session.user.id
  ) {
    notFound();
  }

  const comparison = compareRuns(run1, run2);

  return (
    <div className="container mx-auto py-8 flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/sites/${run1.monitor.siteId}`}>
              {run1.monitor.site.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/runs/${run2.id}`}>Run Details</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Compare Runs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <Link href={`/sites/${run1.monitor.siteId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Site
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Compare Runs</h1>
        <p className="text-muted-foreground">{run1.monitor.site.name}</p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="flex gap-4 p-4">
            {run1.screenshotData ? (
              <div className="w-28 shrink-0">
                <ScreenshotThumbnail
                  screenshotData={run1.screenshotData}
                  siteName={run1.monitor.site.name}
                  strategy={run1.monitor.strategy}
                  compact
                />
              </div>
            ) : (
              <div className="w-28 h-20 shrink-0 rounded-md border bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No image</span>
              </div>
            )}
            <div className="flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-semibold">Run 1 (Before)</h3>
                <p className="text-sm text-muted-foreground">
                  {run1.completedAt
                    ? format(new Date(run1.completedAt), "PPpp")
                    : "Incomplete"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {run1.monitor.strategy.charAt(0).toUpperCase() +
                    run1.monitor.strategy.slice(1)}
                </p>
              </div>
              <Link href={`/runs/${run1.id}`}>
                <Button variant="outline" size="sm" className="mt-2">
                  View Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex gap-4 p-4">
            {run2.screenshotData ? (
              <div className="w-28 shrink-0">
                <ScreenshotThumbnail
                  screenshotData={run2.screenshotData}
                  siteName={run2.monitor.site.name}
                  strategy={run2.monitor.strategy}
                  compact
                />
              </div>
            ) : (
              <div className="w-28 h-20 shrink-0 rounded-md border bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No image</span>
              </div>
            )}
            <div className="flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-semibold">Run 2 (After)</h3>
                <p className="text-sm text-muted-foreground">
                  {run2.completedAt
                    ? format(new Date(run2.completedAt), "PPpp")
                    : "Incomplete"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {run2.monitor.strategy.charAt(0).toUpperCase() +
                    run2.monitor.strategy.slice(1)}
                </p>
              </div>
              <Link href={`/runs/${run2.id}`}>
                <Button variant="outline" size="sm" className="mt-2">
                  View Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Scores Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.scores.map((score, index) => (
                <TableRow 
                  key={score.name}
                  className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}
                >
                  <TableCell className="font-medium">{score.name}</TableCell>
                  <TableCell>
                    {formatMetricValue(score.before, score.unit)}
                  </TableCell>
                  <TableCell>
                    {formatMetricValue(score.after, score.unit)}
                  </TableCell>
                  <TableCell>
                    {formatDelta(score.delta, score.unit)}
                    {score.percentChange !== null && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({score.percentChange > 0 ? "+" : ""}
                        {score.percentChange.toFixed(1)}%)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge metric={score} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Core Web Vitals Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.metrics.map((metric, index) => (
                <TableRow 
                  key={metric.name}
                  className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}
                >
                  <TableCell className="font-medium">{metric.name}</TableCell>
                  <TableCell>
                    {formatMetricValue(metric.before, metric.unit)}
                  </TableCell>
                  <TableCell>
                    {formatMetricValue(metric.after, metric.unit)}
                  </TableCell>
                  <TableCell>
                    {formatDelta(metric.delta, metric.unit)}
                    {metric.percentChange !== null && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({metric.percentChange > 0 ? "+" : ""}
                        {metric.percentChange.toFixed(1)}%)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge metric={metric} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {comparison.audits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audits Comparison</CardTitle>
            <CardDescription>
              Audits that changed between runs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit</TableHead>
                  <TableHead>Before</TableHead>
                  <TableHead>After</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.audits.map((audit, index) => (
                  <TableRow 
                    key={audit.auditId}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}
                  >
                    <TableCell className="font-medium">{audit.title}</TableCell>
                    <TableCell>
                      {audit.beforeScore !== null
                        ? (audit.beforeScore * 100).toFixed(0)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {audit.afterScore !== null
                        ? (audit.afterScore * 100).toFixed(0)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {audit.scoreDelta !== null ? (
                        <Badge
                          variant={
                            audit.isRegression ? "destructive" : "success"
                          }
                          className="gap-1"
                        >
                          {audit.isRegression ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {(audit.scoreDelta * 100).toFixed(0)}
                        </Badge>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
