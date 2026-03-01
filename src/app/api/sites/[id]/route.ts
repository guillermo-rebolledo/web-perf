import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canonicalizeUrl } from "@/lib/url-utils";
import { RunStatus } from "@prisma/client";
import { resolveUser } from "@/lib/resolve-user";

const updateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
});

// GET /api/sites/[id] - Get site details
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

    const site = await prisma.site.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        monitors: {
          include: {
            runs: {
              where: {
                status: RunStatus.success,
              },
              orderBy: {
                completedAt: "desc",
              },
              take: 30,
            },
          },
        },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error("Error fetching site:", error);
    return NextResponse.json(
      { error: "Failed to fetch site" },
      { status: 500 }
    );
  }
}

// PUT /api/sites/[id] - Update site
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if site exists and belongs to user
    const existing = await prisma.site.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSiteSchema.parse(body);

    const updateData: { name?: string; url?: string } = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.url) updateData.url = canonicalizeUrl(validated.url);

    const site = await prisma.site.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(site);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating site:", error);
    return NextResponse.json(
      { error: "Failed to update site" },
      { status: 500 }
    );
  }
}

// DELETE /api/sites/[id] - Delete site
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if site exists and belongs to user
    const existing = await prisma.site.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    await prisma.site.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting site:", error);
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 }
    );
  }
}
