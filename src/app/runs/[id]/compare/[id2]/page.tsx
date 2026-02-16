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
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { compareRuns, formatMetricValue, formatDelta } from "@/lib/metrics-compare";
import { format } from "date-fns";

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
    <div className="container mx-auto py-8">
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
          <CardHeader>
            <CardTitle>Run 1 (Before)</CardTitle>
            <CardDescription>
              {run1.completedAt
                ? format(new Date(run1.completedAt), "PPpp")
                : "Incomplete"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/runs/${run1.id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Run 2 (After)</CardTitle>
            <CardDescription>
              {run2.completedAt
                ? format(new Date(run2.completedAt), "PPpp")
                : "Incomplete"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/runs/${run2.id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
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
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
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
                    {score.delta !== null && score.delta !== 0 ? (
                      score.isImprovement ? (
                        <Badge variant="success" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Improved
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Regressed
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline">No change</Badge>
                    )}
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
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
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
                    {metric.delta !== null && metric.delta !== 0 ? (
                      metric.isImprovement ? (
                        <Badge variant="success" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Improved
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Regressed
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline">No change</Badge>
                    )}
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
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
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
