import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { RootCausePanel } from "@/components/root-cause-panel";
import { cn } from "@/lib/utils";

export default async function RegressionDetailsPage({
  params,
}: {
  params: Promise<{ id: string; alertId: string }>;
}) {
  const { id: runId, alertId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch the regression alert with full details
  const alert = await prisma.regressionAlert.findFirst({
    where: { id: alertId },
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
  });

  if (!alert || alert.run.monitor.site.userId !== session.user.id) {
    notFound();
  }

  // Parse JSON fields
  const likelyCauses = (alert.likelyCauses as unknown as Array<{
    id: string;
    title: string;
    description: string;
    confidence: number;
    estimatedImpact: number;
    evidence: Array<{ type: "metric" | "audit" | "resource" | "insight"; label: string; before: string | number; after: string | number; delta: string | number }>;
    recommendations: string[];
  }>) || [];
  const diffSummary = (alert.diffSummary as unknown as {
    network: {
      totalBytesDelta: number;
      requestCountDelta: number;
      imageBytesDelta: number;
      jsBytesDelta: number;
      cssBytesDelta: number;
      fontBytesDelta: number;
      thirdPartyBytesDelta: number;
      newDomains: string[];
      removedDomains: string[];
    };
    mainThread: {
      scriptingTimeDelta: number;
      renderingTimeDelta: number;
      longTaskCountDelta: number;
      totalMainThreadTimeDelta: number;
    };
    rendering: {
      lcpResourceChanged: boolean;
      lcpResourceBefore: string;
      lcpResourceAfter: string;
      clsShiftSourcesChanged: boolean;
    };
    backend: {
      ttfbDelta: number;
      serverLatencyDelta: number;
    };
  } | null) || null;

  const severityConfig = {
    critical: {
      label: "Critical",
      className: "bg-destructive text-destructive-foreground",
    },
    moderate: { label: "Moderate", className: "bg-orange-500 text-white" },
    minor: { label: "Minor", className: "bg-yellow-500 text-white" },
  };

  const confidenceConfig = {
    high: { label: "High Confidence", variant: "default" as const },
    medium: { label: "Medium Confidence", variant: "secondary" as const },
    low: { label: "Low Confidence", variant: "outline" as const },
  };

  const severityInfo =
    severityConfig[alert.severity as keyof typeof severityConfig];
  const confidenceInfo =
    confidenceConfig[alert.confidence as keyof typeof confidenceConfig];

  const formatMetricValue = (value: number) => {
    if (alert.metricName === "cls") return value.toFixed(3);
    return Math.round(value);
  };

  const getMetricUnit = () => {
    if (alert.metricName === "cls") return "";
    return "ms";
  };

  return (
    <div className="container mx-auto py-8 flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/sites/${alert.run.monitor.siteId}`}>
              {alert.run.monitor.site.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/runs/${runId}`}>Run Details</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Regression Analysis</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle className="text-2xl">
                  {alert.metricName.toUpperCase()} Regression Detected
                </CardTitle>
                <CardDescription>
                  Performance degradation analysis and root cause investigation
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className={severityInfo.className}>
                {severityInfo.label}
              </Badge>
              <Badge variant={confidenceInfo.variant}>
                {confidenceInfo.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                Baseline Value
              </div>
              <div className="text-3xl font-bold font-mono">
                {formatMetricValue(alert.baselineValue)}
                <span className="text-lg text-muted-foreground ml-2">
                  {getMetricUnit()}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Current Value</div>
              <div className="text-3xl font-bold font-mono text-destructive">
                {formatMetricValue(alert.actualValue)}
                <span className="text-lg text-muted-foreground ml-2">
                  {getMetricUnit()}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Regression</div>
              <div className="text-3xl font-bold font-mono text-destructive">
                +{formatMetricValue(alert.delta)}
                <span className="text-lg text-muted-foreground ml-2">
                  (+{alert.percentChange.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Root Cause Analysis */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Root Cause Analysis
          </h2>
          <p className="text-muted-foreground">
            Likely causes ranked by confidence and estimated impact
          </p>
        </div>
        <RootCausePanel causes={likelyCauses} />
      </div>

      {/* Diff Summary */}
      {diffSummary && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Performance Changes
            </h2>
            <p className="text-muted-foreground">
              Detailed before/after comparison across key dimensions
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Network Changes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Bytes:</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      diffSummary.network.totalBytesDelta > 0 &&
                        "text-destructive",
                    )}
                  >
                    {diffSummary.network.totalBytesDelta > 0 ? "+" : ""}
                    {(diffSummary.network.totalBytesDelta / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requests:</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      diffSummary.network.requestCountDelta > 0 &&
                        "text-destructive",
                    )}
                  >
                    {diffSummary.network.requestCountDelta > 0 ? "+" : ""}
                    {diffSummary.network.requestCountDelta}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">JavaScript:</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      diffSummary.network.jsBytesDelta > 0 &&
                        "text-destructive",
                    )}
                  >
                    {diffSummary.network.jsBytesDelta > 0 ? "+" : ""}
                    {(diffSummary.network.jsBytesDelta / 1024).toFixed(1)} KB
                  </span>
                </div>
                {diffSummary.network.newDomains &&
                  diffSummary.network.newDomains.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-muted-foreground mb-1">
                        New Domains:
                      </div>
                      {diffSummary.network.newDomains.map((domain: string) => (
                        <div key={domain} className="text-xs text-destructive">
                          • {domain}
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Main Thread Changes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Main Thread</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Work:</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      diffSummary.mainThread.totalMainThreadTimeDelta > 0 &&
                        "text-destructive",
                    )}
                  >
                    {diffSummary.mainThread.totalMainThreadTimeDelta > 0
                      ? "+"
                      : ""}
                    {diffSummary.mainThread.totalMainThreadTimeDelta.toFixed(0)}{" "}
                    ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scripting Time:</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      diffSummary.mainThread.scriptingTimeDelta > 0 &&
                        "text-destructive",
                    )}
                  >
                    {diffSummary.mainThread.scriptingTimeDelta > 0 ? "+" : ""}
                    {diffSummary.mainThread.scriptingTimeDelta.toFixed(0)} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Long Tasks:</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      diffSummary.mainThread.longTaskCountDelta > 0 &&
                        "text-destructive",
                    )}
                  >
                    {diffSummary.mainThread.longTaskCountDelta > 0 ? "+" : ""}
                    {diffSummary.mainThread.longTaskCountDelta}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Rendering Changes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rendering</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    LCP Resource Changed:
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      diffSummary.rendering.lcpResourceChanged &&
                        "text-destructive",
                    )}
                  >
                    {diffSummary.rendering.lcpResourceChanged ? "Yes" : "No"}
                  </span>
                </div>
                {diffSummary.rendering.lcpResourceChanged && (
                  <div className="text-xs space-y-1 pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground">Before:</span>
                      <div className="truncate">
                        {diffSummary.rendering.lcpResourceBefore || "Unknown"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">After:</span>
                      <div className="truncate">
                        {diffSummary.rendering.lcpResourceAfter || "Unknown"}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Backend Changes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Backend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TTFB:</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      diffSummary.backend.ttfbDelta > 0 && "text-destructive",
                    )}
                  >
                    {diffSummary.backend.ttfbDelta > 0 ? "+" : ""}
                    {diffSummary.backend.ttfbDelta.toFixed(0)} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Server Latency:</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      diffSummary.backend.serverLatencyDelta > 0 &&
                        "text-destructive",
                    )}
                  >
                    {diffSummary.backend.serverLatencyDelta > 0 ? "+" : ""}
                    {diffSummary.backend.serverLatencyDelta.toFixed(0)} ms
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
