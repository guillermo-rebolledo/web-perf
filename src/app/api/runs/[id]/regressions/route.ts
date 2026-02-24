import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/runs/[id]/regressions
 * Get all regression alerts for a run
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify run ownership
    const run = await prisma.run.findFirst({
      where: { id },
      include: {
        monitor: {
          include: {
            site: true,
          },
        },
      },
    });

    if (!run || run.monitor.site.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch regression alerts
    const alerts = await prisma.regressionAlert.findMany({
      where: { runId: id },
      orderBy: { severity: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching regression alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
