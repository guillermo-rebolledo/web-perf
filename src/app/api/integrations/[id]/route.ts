import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  webhookUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  monitorIds: z.array(z.string()).optional(),
});

// PATCH /api/integrations/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await resolveUser(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.integration.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { name, webhookUrl, isActive, monitorIds } = parsed.data;

  // Verify new monitorIds if provided
  if (monitorIds !== undefined && monitorIds.length > 0) {
    const count = await prisma.monitor.count({
      where: { id: { in: monitorIds }, site: { userId } },
    });
    if (count !== monitorIds.length) {
      return NextResponse.json({ error: "Invalid monitor IDs" }, { status: 400 });
    }
  }

  const currentConfig = existing.config as { type: string; webhookUrl: string };
  const updatedConfig = webhookUrl
    ? { ...currentConfig, webhookUrl }
    : currentConfig;

  const integration = await prisma.$transaction(async (tx) => {
    const updated = await tx.integration.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(webhookUrl !== undefined ? { config: updatedConfig } : {}),
      },
      include: { _count: { select: { monitorIntegrations: true } } },
    });

    if (monitorIds !== undefined) {
      await tx.monitorIntegration.deleteMany({ where: { integrationId: id } });
      if (monitorIds.length > 0) {
        await tx.monitorIntegration.createMany({
          data: monitorIds.map((monitorId) => ({ integrationId: id, monitorId })),
        });
      }
    }

    return updated;
  });

  // Re-fetch count after potential monitorIntegration changes
  const finalCount = await prisma.monitorIntegration.count({ where: { integrationId: id } });

  return NextResponse.json({
    integration: {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      isActive: integration.isActive,
      monitorCount: finalCount,
      createdAt: integration.createdAt.toISOString(),
    },
  });
}

// DELETE /api/integrations/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await resolveUser(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.integration.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.integration.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
