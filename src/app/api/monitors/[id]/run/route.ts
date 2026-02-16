import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueAuditJob } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/monitors/[id]/run - Trigger on-demand run
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(session.user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429 }
      );
    }

    // Check if monitor exists and belongs to user
    const monitor = await prisma.monitor.findFirst({
      where: {
        id,
      },
      include: {
        site: true,
        runs: {
          where: {
            status: {
              in: ["queued", "running"],
            },
          },
          take: 1,
        },
      },
    });

    if (!monitor || monitor.site.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Monitor not found" },
        { status: 404 }
      );
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
        status: "queued",
        queuedAt: new Date(),
      },
    });

    // Enqueue the job
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

    return NextResponse.json(
      {
        runId: run.id,
        jobId,
        remaining: rateLimit.remaining,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error triggering run:", error);
    return NextResponse.json(
      { error: "Failed to trigger run" },
      { status: 500 }
    );
  }
}
