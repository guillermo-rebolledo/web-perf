import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";

// GET /api/runs/[id]/status - Lightweight status check for polling
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const run = await prisma.run.findFirst({
      where: { id },
      select: {
        status: true,
        errorMessage: true,
        monitor: {
          select: {
            site: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!run || run.monitor.site.userId !== userId) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: run.status,
      errorMessage: run.errorMessage,
    });
  } catch (error) {
    console.error("Error fetching run status:", error);
    return NextResponse.json(
      { error: "Failed to fetch run status" },
      { status: 500 }
    );
  }
}
