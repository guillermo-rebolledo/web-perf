import type { Job } from "bullmq";
import type { AuditJobData } from "@/lib/queue";
import { Prisma, RunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchPageSpeedInsights, parsePSIResponse } from "@/lib/psi-parser";
import { env } from "@/env";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { detectRegressions } from "@/lib/regression/detector";
import { calculateBaselines } from "@/lib/regression/baseline-calculator";
import { analyzeRootCauses } from "@/lib/regression/rules-engine";
import { calculateDiffSummary } from "@/lib/regression/diff-engine";

/** Enabled when NODE_ENV is not production and --debug-psi is passed as a CLI argument */
const PSI_DEBUG_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.argv.includes("--debug-psi");

/**
 * Helper function to write PSI response to a debug file.
 * Only called when PSI_DEBUG_ENABLED is true.
 * File is overwritten on each run for easier debugging.
 */
async function writeDebugFile(data: unknown, filename = "psi-debug.json") {
  try {
    const debugPath = join(process.cwd(), filename);
    await writeFile(debugPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[Worker] Debug file written to: ${debugPath}`);
  } catch (error) {
    console.error("[Worker] Failed to write debug file:", error);
    // Don't throw - debug file is optional
  }
}

function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  // PSI errors format: "PageSpeed Insights API error (NNN): <response body>"
  // Keep only the safe prefix — strip everything after the status code.
  const psiMatch = raw.match(/^(PageSpeed Insights API error \(\d+\))/);
  if (psiMatch) return psiMatch[1];
  // Truncate any other error message to prevent unexpected leakage
  return raw.length > 500 ? `${raw.slice(0, 500)}\u2026` : raw;
}

export async function processAuditJob(job: Job<AuditJobData>) {
  const { runId, monitorId, siteUrl, strategy } = job.data;

  console.log(`[Worker] Processing audit job ${job.id} for run ${runId}`);

  try {
    // Update run status to running
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: RunStatus.running,
        startedAt: new Date(),
      },
    });

    // Fetch PageSpeed Insights data
    console.log(`[Worker] Fetching PSI data for ${siteUrl} (${strategy})`);
    const psiResponse = await fetchPageSpeedInsights(
      siteUrl,
      strategy,
      env.PAGESPEED_API_KEY,
    );

    if (PSI_DEBUG_ENABLED) {
      await writeDebugFile(psiResponse, `psi-debug-${strategy}.json`);
    }

    // Parse the response
    const metrics = parsePSIResponse(psiResponse);
    console.log(`[Worker] Parsed metrics:`, {
      performanceScore: metrics.performanceScore,
      lcp: metrics.lcp,
      cls: metrics.cls,
    });
    console.log(`[Worker] Environment metadata:`, {
      browserUserAgent: metrics.browserUserAgent,
      benchmarkIndex: metrics.benchmarkIndex,
      emulatedFormFactor: metrics.emulatedFormFactor,
    });

    // Update run with results and create audits
    await prisma.$transaction(async (tx) => {
      // Update run with metrics
      await tx.run.update({
        where: { id: runId },
        data: {
          status: RunStatus.success,
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
          lighthouseVersion: metrics.lighthouseVersion,
          finalUrl: metrics.finalUrl,
          runWarnings: metrics.runWarnings,
          browserUserAgent: metrics.browserUserAgent,
          benchmarkIndex: metrics.benchmarkIndex,
          emulatedFormFactor: metrics.emulatedFormFactor,
          speedIndex: metrics.speedIndex,
          tti: metrics.tti,
          totalByteWeight: metrics.totalByteWeight,
          numRequests: metrics.numRequests,
          mainThreadWork: metrics.mainThreadWork,
          screenshotData: metrics.screenshot,
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
            scored: audit.scored,
            displayValue: audit.displayValue,
            numericValue: audit.numericValue,
          })),
        });
      }

      // Create insight records
      if (metrics.insights.length > 0) {
        await tx.insight.createMany({
          data: metrics.insights.map((insight) => ({
            runId,
            insightId: insight.insightId,
            title: insight.title,
            description: insight.description,
            score: insight.score,
            scored: insight.scored,
            displayValue: insight.displayValue,
            metricSavings: insight.metricSavings ?? undefined,
            sources: insight.sources
              ? (insight.sources as unknown as Prisma.InputJsonValue)
              : undefined,
          })),
        });
      }
    });

    // Regression detection (Phase 2)
    try {
      // Fetch the updated run with monitor relation
      const updatedRun = await prisma.run.findUnique({
        where: { id: runId },
        include: { monitor: true },
      });

      if (updatedRun && updatedRun.monitor) {
        // Detect regressions for this run
        const regressions = await detectRegressions(updatedRun);

        if (regressions.length > 0) {
          console.log(
            `[Worker] Detected ${regressions.length} regression(s) for run ${runId}`,
          );

          // Analyze root causes and calculate diff summary for each regression
          const enrichedRegressions = await Promise.all(
            regressions.map(async (regression) => {
              try {
                const [causes, diffSummary] = await Promise.all([
                  analyzeRootCauses(regression.metricName, updatedRun, prisma),
                  calculateDiffSummary(updatedRun, prisma),
                ]);

                return {
                  ...regression,
                  likelyCauses: causes as unknown as Prisma.InputJsonValue,
                  diffSummary: diffSummary as unknown as Prisma.InputJsonValue,
                };
              } catch (err) {
                console.error(
                  `[Worker] Error analyzing root causes for ${regression.metricName}:`,
                  err,
                );
                // Return regression without analysis if it fails
                return regression;
              }
            }),
          );

          // Save regression alerts with root cause analysis
          await prisma.regressionAlert.createMany({
            data: enrichedRegressions,
          });

          console.log(
            `[Worker] Saved ${enrichedRegressions.length} regression alert(s) with root cause analysis`,
          );
        }

        // Asynchronously recalculate baselines (don't await - fire and forget)
        void calculateBaselines(updatedRun.monitor.id, prisma).catch((err) => {
          console.error(
            `[Worker] Error calculating baselines for monitor ${updatedRun.monitor.id}:`,
            err,
          );
        });
      }
    } catch (error) {
      console.error(
        `[Worker] Error during regression detection for run ${runId}:`,
        error,
      );
      // Don't fail the job if regression detection fails
    }

    // Notifications (fire-and-forget — never blocks job completion)
    void (async () => {
      try {
        const { fireIntegrations } = await import("@/lib/notifications");
        const { filterNewRegressions } = await import(
          "@/lib/notifications/deduplication"
        );
        const runWithSite = await prisma.run.findUnique({
          where: { id: runId },
          include: {
            monitor: { include: { site: true } },
            regressionAlerts: {
              where: { createdAt: { gte: new Date(Date.now() - 60_000) } },
              select: {
                metricName: true,
                severity: true,
                percentChange: true,
                baselineValue: true,
                actualValue: true,
              },
            },
          },
        });
        if (!runWithSite?.monitor?.site) return;

        const newRegressions = await filterNewRegressions(
          monitorId,
          runId,
          runWithSite.regressionAlerts,
          prisma,
        );

        // Skip notification if all regressions are already open/acknowledged
        if (
          runWithSite.regressionAlerts.length > 0 &&
          newRegressions.length === 0
        ) {
          console.log(
            `[Notifications] All ${runWithSite.regressionAlerts.length} regression(s) suppressed for run ${runId} (already open/acknowledged)`,
          );
          return;
        }

        await fireIntegrations({
          run: {
            id: runWithSite.id,
            monitorId: runWithSite.monitorId,
            performanceScore: runWithSite.performanceScore,
            lcp: runWithSite.lcp,
            cls: runWithSite.cls,
            inp: runWithSite.inp,
            fcp: runWithSite.fcp,
            ttfb: runWithSite.ttfb,
            finalUrl: runWithSite.finalUrl,
            completedAt: runWithSite.completedAt,
            monitor: {
              id: runWithSite.monitor.id,
              strategy: runWithSite.monitor.strategy,
              site: {
                name: runWithSite.monitor.site.name,
                url: runWithSite.monitor.site.url,
              },
              userId: runWithSite.monitor.site.userId,
            },
          },
          regressions: newRegressions,
          appBaseUrl: env.NEXTAUTH_URL ?? "http://localhost:3000",
        });
      } catch (err) {
        console.error("[Worker] Notification dispatch error:", err);
      }
    })();

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
        status: RunStatus.failed,
        completedAt: new Date(),
        errorMessage: sanitizeErrorMessage(error),
      },
    });

    throw error; // Re-throw to mark job as failed
  }
}
