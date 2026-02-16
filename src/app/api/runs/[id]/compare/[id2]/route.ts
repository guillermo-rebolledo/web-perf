import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareRuns } from "@/lib/metrics-compare";

// GET /api/runs/[id]/compare/[id2] - Compare two runs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; id2: string }> }
) {
  try {
    const { id, id2 } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch both runs with audits
    const [run1, run2] = await Promise.all([
      prisma.run.findFirst({
        where: {
          id,
        },
        include: {
          monitor: {
            include: {
              site: true,
            },
          },
          audits: true,
        },
      }),
      prisma.run.findFirst({
        where: {
          id: id2,
        },
        include: {
          monitor: {
            include: {
              site: true,
            },
          },
          audits: true,
        },
      }),
    ]);

    if (!run1 || run1.monitor.site.userId !== session.user.id) {
      return NextResponse.json({ error: "Run 1 not found" }, { status: 404 });
    }

    if (!run2 || run2.monitor.site.userId !== session.user.id) {
      return NextResponse.json({ error: "Run 2 not found" }, { status: 404 });
    }

    // Compare the runs
    const comparison = compareRuns(run1, run2);

    return NextResponse.json({
      run1: {
        id: run1.id,
        completedAt: run1.completedAt,
        status: run1.status,
      },
      run2: {
        id: run2.id,
        completedAt: run2.completedAt,
        status: run2.status,
      },
      comparison,
    });
  } catch (error) {
    console.error("Error comparing runs:", error);
    return NextResponse.json(
      { error: "Failed to compare runs" },
      { status: 500 }
    );
  }
}
