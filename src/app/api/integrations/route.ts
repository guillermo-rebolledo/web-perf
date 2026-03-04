import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.literal("slack"),
  webhookUrl: z.string().url(),
  monitorIds: z.array(z.string()).optional(), // empty/absent = all monitors
});

// GET /api/integrations — list user's integrations (no webhookUrl returned)
export async function GET(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await prisma.integration.findMany({
    where: { userId },
    include: { _count: { select: { monitorIntegrations: true } } },
    orderBy: { createdAt: "desc" },
  });

  const items = integrations.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type,
    isActive: i.isActive,
    monitorCount: i._count.monitorIntegrations,
    createdAt: i.createdAt.toISOString(),
  }));

  return NextResponse.json({ integrations: items });
}

// POST /api/integrations — create integration
export async function POST(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { name, type, webhookUrl, monitorIds } = parsed.data;

  // Verify monitorIds belong to the user
  if (monitorIds && monitorIds.length > 0) {
    const count = await prisma.monitor.count({
      where: { id: { in: monitorIds }, site: { userId } },
    });
    if (count !== monitorIds.length) {
      return NextResponse.json({ error: "Invalid monitor IDs" }, { status: 400 });
    }
  }

  const integration = await prisma.integration.create({
    data: {
      userId,
      name,
      type,
      config: { type, webhookUrl },
      ...(monitorIds && monitorIds.length > 0
        ? {
            monitorIntegrations: {
              createMany: { data: monitorIds.map((monitorId) => ({ monitorId })) },
            },
          }
        : {}),
    },
    include: { _count: { select: { monitorIntegrations: true } } },
  });

  return NextResponse.json({
    integration: {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      isActive: integration.isActive,
      monitorCount: integration._count.monitorIntegrations,
      createdAt: integration.createdAt.toISOString(),
    },
  });
}
