import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/regressions/[alertId]
 * Get specific regression alert details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { alertId } = await params;

    // Fetch alert with run ownership check
    const alert = await prisma.regressionAlert.findFirst({
      where: { id: alertId },
      include: {
        run: {
          include: {
            monitor: {
              include: {
                site: true,
              },
            },
          },
        },
      },
    });

    if (!alert || alert.run.monitor.site.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Error fetching regression alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/regressions/[alertId]
 * Update regression alert (mark resolved, add notes)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { alertId } = await params;
    const body = await request.json();

    // Verify ownership
    const alert = await prisma.regressionAlert.findFirst({
      where: { id: alertId },
      include: {
        run: {
          include: {
            monitor: {
              include: {
                site: true,
              },
            },
          },
        },
      },
    });

    if (!alert || alert.run.monitor.site.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update alert
    const updated = await prisma.regressionAlert.update({
      where: { id: alertId },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.status === "acknowledged" && {
          acknowledgedAt: new Date(),
          acknowledgedBy: session.user.id,
        }),
      },
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error("Error updating regression alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
