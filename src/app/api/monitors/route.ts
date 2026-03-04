import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueAuditJob } from "@/lib/queue";
import { z } from "zod";
import { RunStatus } from "@prisma/client";
import { resolveUser } from "@/lib/resolve-user";
import { randomBytes } from "crypto";

const createMonitorSchema = z.object({
  siteId: z.string().cuid(),
  triggerType: z.enum(["schedule", "deployment"]).default("schedule"),
  cadenceMinutes: z.number().int().min(30).max(43200).default(1440),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
  isActive: z.boolean().default(true),
  githubRepo: z.string().max(200).optional().nullable(),
  githubBranch: z.string().max(100).default("main").optional(),
});

// GET /api/monitors?siteId=X - List monitors for a site
export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 }
      );
    }

    // Verify site belongs to user
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId,
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const monitors = await prisma.monitor.findMany({
      where: {
        siteId,
      },
      include: {
        runs: {
          where: {
            status: RunStatus.success,
          },
          orderBy: {
            completedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(monitors);
  } catch (error) {
    console.error("Error fetching monitors:", error);
    return NextResponse.json(
      { error: "Failed to fetch monitors" },
      { status: 500 }
    );
  }
}

// POST /api/monitors - Create a new monitor
export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createMonitorSchema.parse(body);

    // Verify site belongs to user
    const site = await prisma.site.findFirst({
      where: {
        id: validated.siteId,
        userId,
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (validated.triggerType === "deployment") {
      // Deployment monitors: never run on schedule; auto-generate secret
      const webhookSecret = randomBytes(32).toString("hex");

      const monitor = await prisma.monitor.create({
        data: {
          siteId: validated.siteId,
          triggerType: "deployment",
          cadenceMinutes: validated.cadenceMinutes,
          strategy: validated.strategy,
          isActive: validated.isActive,
          // Sentinel date: scheduler will never pick this up
          nextRunAt: new Date("2999-12-31"),
          githubRepo: validated.githubRepo ?? null,
          githubBranch: validated.githubBranch ?? "main",
          githubWebhookSecret: webhookSecret,
        },
      });

      return NextResponse.json(
        { ...monitor, webhookSecret },
        { status: 201 }
      );
    }

    // Schedule monitor: create and enqueue the initial run immediately
    const monitor = await prisma.monitor.create({
      data: {
        siteId: validated.siteId,
        triggerType: "schedule",
        cadenceMinutes: validated.cadenceMinutes,
        strategy: validated.strategy,
        isActive: validated.isActive,
        nextRunAt: new Date(
          Date.now() + validated.cadenceMinutes * 60 * 1000
        ),
      },
    });

    const run = await prisma.run.create({
      data: {
        monitorId: monitor.id,
        status: RunStatus.queued,
        queuedAt: new Date(),
      },
    });

    const jobId = await enqueueAuditJob({
      runId: run.id,
      monitorId: monitor.id,
      siteUrl: site.url,
      strategy: validated.strategy,
    });

    await prisma.run.update({
      where: { id: run.id },
      data: { jobId },
    });

    return NextResponse.json(
      { ...monitor, runId: run.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating monitor:", error);
    return NextResponse.json(
      { error: "Failed to create monitor" },
      { status: 500 }
    );
  }
}
