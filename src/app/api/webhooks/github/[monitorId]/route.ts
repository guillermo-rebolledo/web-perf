import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueAuditJob } from "@/lib/queue";
import { verifyGitHubSignature, isSuccessfulDeployment } from "@/lib/github-webhook";
import { RunStatus } from "@prisma/client";
import { recordActivity } from "@/lib/activity";
import { createLogger } from "@/lib/logger";

const log = createLogger("Webhook:GitHub");

// POST /api/webhooks/github/[monitorId]
// Receives GitHub deployment_status webhook events and triggers a performance audit.
// Auth is HMAC-SHA256 signature verification — no user session required.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ monitorId: string }> }
) {
  try {
    const { monitorId } = await params;

    // Read raw body first — needed for HMAC verification before JSON parse
    const rawBody = await request.text();

    const signatureHeader = request.headers.get("x-hub-signature-256");
    const eventType = request.headers.get("x-github-event");

    // No-op for non-deployment_status events
    if (eventType !== "deployment_status") {
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    // Look up monitor — verify it exists and has GitHub integration enabled
    const monitor = await prisma.monitor.findFirst({
      where: { id: monitorId },
      include: {
        site: true,
        runs: {
          where: { status: { in: ["queued", "running"] } },
          take: 1,
        },
      },
    });

    if (!monitor || monitor.triggerType !== "deployment" || !monitor.githubWebhookSecret) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    // Verify HMAC signature
    const isValid = verifyGitHubSignature(
      rawBody,
      monitor.githubWebhookSecret,
      signatureHeader
    );
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload and check for successful production deployment
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!isSuccessfulDeployment(body)) {
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    // Idempotency check: prevent concurrent runs
    if (monitor.runs.length > 0) {
      return NextResponse.json(
        {
          error: "Monitor already has a run in progress",
          runId: monitor.runs[0].id,
        },
        { status: 409 }
      );
    }

    // Create a new run
    const run = await prisma.run.create({
      data: {
        monitorId: monitor.id,
        status: RunStatus.queued,
        queuedAt: new Date(),
      },
    });

    // Enqueue the audit job
    const jobId = await enqueueAuditJob({
      runId: run.id,
      monitorId: monitor.id,
      siteUrl: monitor.site.url,
      strategy: monitor.strategy as "mobile" | "desktop",
    });

    // Update run with jobId
    await prisma.run.update({
      where: { id: run.id },
      data: { jobId },
    });

    try {
      await recordActivity(prisma, monitor.site.userId, "deployment_run_triggered", run.id, {
        type: "deployment_run_triggered",
        siteName: monitor.site.name,
        siteUrl: monitor.site.url,
        siteId: monitor.site.id,
        monitorId: monitor.id,
        githubRepo: monitor.githubRepo,
        githubBranch: monitor.githubBranch,
      });
    } catch (activityError) {
      log.error("Activity tracking failed", activityError, { event: "deployment_run_triggered", monitorId, runId: run.id });
    }

    return NextResponse.json({ runId: run.id, jobId }, { status: 202 });
  } catch (error) {
    log.error("Error processing GitHub webhook", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
