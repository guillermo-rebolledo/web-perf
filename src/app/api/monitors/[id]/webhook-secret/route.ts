import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { resolveUser } from "@/lib/resolve-user";

// POST /api/monitors/[id]/webhook-secret
// Generates (or rotates) a webhook secret for a monitor's GitHub integration.
// The raw secret is returned ONCE — it cannot be retrieved again.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify monitor exists and belongs to the user
    const monitor = await prisma.monitor.findFirst({
      where: { id },
      include: { site: true },
    });

    if (!monitor || monitor.site.userId !== userId) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    // Generate 32-byte hex secret
    const secret = randomBytes(32).toString("hex");

    await prisma.monitor.update({
      where: { id },
      data: { githubWebhookSecret: secret },
    });

    // Return raw secret once — not stored in a retrievable form
    return NextResponse.json({ secret }, { status: 200 });
  } catch (error) {
    console.error("Error generating webhook secret:", error);
    return NextResponse.json(
      { error: "Failed to generate webhook secret" },
      { status: 500 }
    );
  }
}
