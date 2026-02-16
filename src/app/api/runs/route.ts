import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/runs?monitorId=X&limit=10&offset=0 - List runs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monitorId = searchParams.get("monitorId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
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

    const runs = await prisma.run.findMany({
      where: {
        monitorId,
      },
      orderBy: {
        queuedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.run.count({
      where: {
        monitorId,
      },
    });

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
