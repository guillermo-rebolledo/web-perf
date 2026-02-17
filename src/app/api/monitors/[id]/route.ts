import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMonitorSchema = z.object({
  cadenceMinutes: z.number().int().min(30).max(43200).optional(),
  strategy: z.enum(["mobile", "desktop"]).optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/monitors/[id] - Update monitor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if monitor exists and belongs to user
    const existing = await prisma.monitor.findFirst({
      where: {
        id,
      },
      include: {
        site: true,
      },
    });

    if (!existing || existing.site.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Monitor not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = updateMonitorSchema.parse(body);

    const monitor = await prisma.monitor.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(monitor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating monitor:", error);
    return NextResponse.json(
      { error: "Failed to update monitor" },
      { status: 500 }
    );
  }
}

// DELETE /api/monitors/[id] - Delete monitor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if monitor exists and belongs to user
    const existing = await prisma.monitor.findFirst({
      where: {
        id,
      },
      include: {
        site: true,
      },
    });

    if (!existing || existing.site.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Monitor not found" },
        { status: 404 }
      );
    }

    await prisma.monitor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting monitor:", error);
    return NextResponse.json(
      { error: "Failed to delete monitor" },
      { status: 500 }
    );
  }
}
