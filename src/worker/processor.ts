import type { Job } from "bullmq";
import type { AuditJobData } from "@/lib/queue";
import * as Sentry from "@sentry/node";
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
import { recordActivity } from "@/lib/activity";
import { createLogger } from "@/lib/logger";

const log = createLogger("Worker");

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
    log.debug("Debug file written", { path: debugPath });
  } catch (error) {
    log.error("Failed to write debug file", error);
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

  log.info("Processing audit job", { jobId: job.id, runId, monitorId, strategy });

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
    log.info("Fetching PSI data", { siteUrl, strategy });
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
    log.debug("Parsed PSI response", {
      performanceScore: metrics.performanceScore,
      lcp: metrics.lcp,
      cls: metrics.cls,
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
          log.info("Detected regressions", { count: regressions.length, runId, monitorId });

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
                log.error("Error analyzing root causes", err, { metric: regression.metricName, runId });
                // Return regression without analysis if it fails
                return regression;
              }
            }),
          );

          // Save regression alerts with root cause analysis
          await prisma.regressionAlert.createMany({
            data: enrichedRegressions,
          });

          log.info("Saved regression alerts", { count: enrichedRegressions.length, runId, monitorId });

          // Activity: regression_detected (fire-and-forget)
          void (async () => {
            try {
              const runForActivity = await prisma.run.findUnique({
                where: { id: runId },
                include: { monitor: { include: { site: true } } },
              });
              if (runForActivity) {
                await recordActivity(prisma, runForActivity.monitor.site.userId, "regression_detected", runForActivity.id, {
                  type: "regression_detected",
                  siteName: runForActivity.monitor.site.name,
                  siteUrl: runForActivity.monitor.site.url,
                  siteId: runForActivity.monitor.site.id,
                  alertCount: enrichedRegressions.length,
                  severities: enrichedRegressions.map((r) => r.severity),
                });
              }
            } catch (err) {
              log.error("Activity tracking failed", err, { event: "regression_detected", runId });
            }
          })();
        }

        // Asynchronously recalculate baselines (don't await - fire and forget)
        void calculateBaselines(updatedRun.monitor.id, prisma).catch((err) => {
          log.error("Error calculating baselines", err, { monitorId: updatedRun.monitor.id });
        });
      }
    } catch (error) {
      log.error("Error during regression detection", error, { runId, monitorId });
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
          log.info("All regressions suppressed (already open/acknowledged)", {
            count: runWithSite.regressionAlerts.length,
            runId,
            monitorId,
          });
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
        log.error("Notification dispatch error", err, { runId, monitorId });
      }
    })();

    // Pattern insight generation (fire-and-forget — triggers after 3+ regressions)
    void (async () => {
      try {
        const monitorWithSite = await prisma.monitor.findUnique({
          where: { id: monitorId },
          include: { site: { select: { userId: true } } },
        });
        if (!monitorWithSite?.site?.userId) return;

        const totalAlertCount = await prisma.regressionAlert.count({
          where: {
            run: { monitorId },
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        });

        log.debug("Pattern insight check", { totalAlertCount, monitorId });
        if (totalAlertCount >= 3) {
          const { FEATURE_FLAGS } = await import("@/lib/feature-flags");
          const { isFeatureEnabled } = await import("@/lib/posthog-server");
          const flagEnabled = await isFeatureEnabled(
            FEATURE_FLAGS.PATTERN_INSIGHT,
            monitorWithSite.site.userId,
            { defaultValue: false }
          );
          if (flagEnabled) {
            const { generatePatternInsight } = await import(
              "@/lib/ai/pattern-insight"
            );
            await generatePatternInsight(monitorId, monitorWithSite.site.userId);
          } else {
            log.debug("Pattern insight skipped: PATTERN_INSIGHT flag disabled", { monitorId });
          }
        }
      } catch (err) {
        log.error("Pattern insight generation error", err, { monitorId });
      }
    })();

    // First-run health report (fire-and-forget — fires exactly once per monitor)
    void (async () => {
      try {
        const monitorWithSite = await prisma.monitor.findUnique({
          where: { id: monitorId },
          include: { site: { select: { userId: true } } },
        });
        if (!monitorWithSite?.site?.userId) return;

        const previousSuccessCount = await prisma.run.count({
          where: {
            monitorId,
            status: RunStatus.success,
            id: { not: runId },
          },
        });

        log.debug("Health report check", { previousSuccessCount, runId, monitorId });
        if (previousSuccessCount === 0) {
          await prisma.run.update({
            where: { id: runId },
            data: { isFirstRun: true },
          });
          const { generateHealthReport } = await import(
            "@/lib/ai/health-report"
          );
          await generateHealthReport(runId, monitorWithSite.site.userId);
        }
      } catch (err) {
        log.error("Health report generation error", err, { runId, monitorId });
      }
    })();

    // Activity: run_completed (fire-and-forget)
    void (async () => {
      try {
        const completedRun = await prisma.run.findUnique({
          where: { id: runId },
          include: { monitor: { include: { site: true } } },
        });
        if (completedRun) {
          await recordActivity(prisma, completedRun.monitor.site.userId, "run_completed", completedRun.id, {
            type: "run_completed",
            siteName: completedRun.monitor.site.name,
            siteUrl: completedRun.monitor.site.url,
            siteId: completedRun.monitor.site.id,
            monitorId: completedRun.monitor.id,
            performanceScore: completedRun.performanceScore,
          });
        }
      } catch (err) {
        log.error("Activity tracking failed", err, { event: "run_completed", runId });
      }
    })();

    // Update monitor lastRunAt
    await prisma.monitor.update({
      where: { id: monitorId },
      data: {
        lastRunAt: new Date(),
      },
    });

    log.info("Completed audit job", { jobId: job.id, runId, monitorId });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { runId, monitorId, siteUrl, strategy },
    });
    log.error("Error processing audit job", error, { jobId: job.id, runId, monitorId, siteUrl, strategy });

    // Update run status to failed
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: RunStatus.failed,
        completedAt: new Date(),
        errorMessage: sanitizeErrorMessage(error),
      },
    });

    // Activity: run_failed (fire-and-forget)
    void (async () => {
      try {
        const failedRun = await prisma.run.findUnique({
          where: { id: runId },
          include: { monitor: { include: { site: true } } },
        });
        if (failedRun) {
          await recordActivity(prisma, failedRun.monitor.site.userId, "run_failed", failedRun.id, {
            type: "run_failed",
            siteName: failedRun.monitor.site.name,
            siteUrl: failedRun.monitor.site.url,
            siteId: failedRun.monitor.site.id,
            monitorId: failedRun.monitor.id,
            errorMessage: failedRun.errorMessage,
          });
        }
      } catch (err) {
        log.error("Activity tracking failed", err, { event: "run_failed", runId });
      }
    })();

    throw error; // Re-throw to mark job as failed
  }
}
