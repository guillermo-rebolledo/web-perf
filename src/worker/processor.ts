import { Job } from "bullmq";
import { AuditJobData } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { fetchPageSpeedInsights, parsePSIResponse } from "@/lib/psi-parser";
import { env } from "@/env";

export async function processAuditJob(job: Job<AuditJobData>) {
  const { runId, monitorId, siteUrl, strategy } = job.data;

  console.log(`[Worker] Processing audit job ${job.id} for run ${runId}`);

  try {
    // Update run status to running
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    // Fetch PageSpeed Insights data
    console.log(`[Worker] Fetching PSI data for ${siteUrl} (${strategy})`);
    const psiResponse = await fetchPageSpeedInsights(
      siteUrl,
      strategy,
      env.PAGESPEED_API_KEY
    );

    // Parse the response
    const metrics = parsePSIResponse(psiResponse);
    console.log(`[Worker] Parsed metrics:`, {
      performanceScore: metrics.performanceScore,
      lcp: metrics.lcp,
      cls: metrics.cls,
    });

    // Update run with results and create audits
    await prisma.$transaction(async (tx) => {
      // Update run with metrics
      await tx.run.update({
        where: { id: runId },
        data: {
          status: "success",
          completedAt: new Date(),
          performanceScore: metrics.performanceScore,
          accessibilityScore: metrics.accessibilityScore,
          bestPracticesScore: metrics.bestPracticesScore,
          seoScore: metrics.seoScore,
          lcp: metrics.lcp,
          inp: metrics.inp,
          tbt: metrics.tbt,
          cls: metrics.cls,
          fcp: metrics.fcp,
          ttfb: metrics.ttfb,
        },
      });

      // Create audit records
      if (metrics.audits.length > 0) {
        await tx.audit.createMany({
          data: metrics.audits.map((audit) => ({
            runId,
            auditId: audit.auditId,
            title: audit.title,
            score: audit.score,
            displayValue: audit.displayValue,
            numericValue: audit.numericValue,
          })),
        });
      }
    });

    // Update monitor lastRunAt
    await prisma.monitor.update({
      where: { id: monitorId },
      data: {
        lastRunAt: new Date(),
      },
    });

    console.log(`[Worker] Successfully completed audit job ${job.id}`);
  } catch (error) {
    console.error(`[Worker] Error processing audit job ${job.id}:`, error);

    // Update run status to failed
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    throw error; // Re-throw to mark job as failed
  }
}
