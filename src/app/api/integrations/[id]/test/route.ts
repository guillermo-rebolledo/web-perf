import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";
import { sendSlackTestMessage } from "@/lib/notifications/slack";

// POST /api/integrations/[id]/test — always returns HTTP 200 with { ok, error? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await resolveUser(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await prisma.integration.findUnique({ where: { id } });
  if (!integration || integration.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const config = integration.config as { type: string; webhookUrl: string };
    if (integration.type === "slack") {
      await sendSlackTestMessage(config.webhookUrl);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message });
  }
}
