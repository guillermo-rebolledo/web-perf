import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueAuditJob } from "@/lib/queue";
import { z } from "zod";

const createMonitorSchema = z.object({
  siteId: z.string().cuid(),
  cadenceMinutes: z.number().int().min(30).max(43200).default(1440),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
  isActive: z.boolean().default(true),
});

// GET /api/monitors?siteId=X - List monitors for a site
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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
        userId: session.user.id,
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
            status: "success",
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createMonitorSchema.parse(body);

    // Verify site belongs to user
    const site = await prisma.site.findFirst({
      where: {
        id: validated.siteId,
        userId: session.user.id,
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const monitor = await prisma.monitor.create({
      data: {
        siteId: validated.siteId,
        cadenceMinutes: validated.cadenceMinutes,
        strategy: validated.strategy,
        isActive: validated.isActive,
        nextRunAt: new Date(
          Date.now() + validated.cadenceMinutes * 60 * 1000
        ),
      },
    });

    // Create and enqueue the initial run immediately
    const run = await prisma.run.create({
      data: {
        monitorId: monitor.id,
        status: "queued",
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
