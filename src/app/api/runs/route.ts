import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RunStatus } from "@prisma/client";
import { subDays } from "date-fns";

// GET /api/runs?monitorId=X&limit=10&offset=0&days=7&status=success - List runs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monitorId = searchParams.get("monitorId");
    const days = searchParams.get("days");
    const statusFilter = searchParams.get("status");
    // When filtering by date range, raise default limit to cover dense history
    const defaultLimit = days ? "100" : "10";
    const limit = parseInt(searchParams.get("limit") || defaultLimit, 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!monitorId) {
      return NextResponse.json(
        { error: "monitorId is required" },
        { status: 400 }
      );
    }

    // Verify monitor belongs to user
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
      },
      include: {
        site: true,
      },
    });

    if (!monitor || monitor.site.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Monitor not found" },
        { status: 404 }
      );
    }

    const where = {
      monitorId,
      ...(days && {
        completedAt: { gte: subDays(new Date(), parseInt(days, 10)) },
      }),
      ...(statusFilter &&
        Object.values(RunStatus).includes(statusFilter as RunStatus) && {
          status: statusFilter as RunStatus,
        }),
    };

    const runs = await prisma.run.findMany({
      where,
      orderBy: {
        queuedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.run.count({ where });

    return NextResponse.json({
      runs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch runs" },
      { status: 500 }
    );
  }
}
