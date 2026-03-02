import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { RootCausePanel } from "@/components/root-cause-panel";
import { RegressionHeader } from "@/components/regression-header";
import { DiffSummarySection } from "@/components/diff-summary-section";
import { parseRegressionCauses, parseDiffSummary } from "@/lib/alert-utils";
import { ChartBar } from "lucide-react";

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
  const likelyCauses = parseRegressionCauses(alert.likelyCauses);
  const diffSummary = parseDiffSummary(alert.diffSummary);

  return (
    <div className="container mx-auto py-8 flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
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

      <RegressionHeader
        metricName={alert.metricName}
        severity={alert.severity}
        confidence={alert.confidence}
        baselineValue={alert.baselineValue}
        actualValue={alert.actualValue}
        delta={alert.delta}
        percentChange={alert.percentChange}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-extrabold tracking-tighter flex items-center gap-2">
          <ChartBar className="size-6 text-primary" />
          Root Cause Analysis
        </h2>
        <RootCausePanel causes={likelyCauses} />
      </section>

      {/* Diff Summary */}
      {diffSummary && <DiffSummarySection diffSummary={diffSummary} />}
    </div>
  );
}
