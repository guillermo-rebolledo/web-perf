import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/runs/[id]/status - Lightweight status check for polling
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
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

    if (!run || run.monitor.site.userId !== session.user.id) {
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
