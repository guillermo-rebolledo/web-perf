import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canonicalizeUrl } from "@/lib/url-utils";
import { RunStatus } from "@prisma/client";
import { resolveUser } from "@/lib/resolve-user";

const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

// GET /api/sites - List user's sites (request not needed for list)
export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sites = await prisma.site.findMany({
      where: {
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
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(sites);
  } catch (error) {
    console.error("Error fetching sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch sites" },
      { status: 500 }
    );
  }
}

// POST /api/sites - Create a new site
export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createSiteSchema.parse(body);

    // Canonicalize URL
    const canonicalUrl = canonicalizeUrl(validated.url);

    // Check if site already exists for this user
    const existing = await prisma.site.findFirst({
      where: {
        userId,
        url: canonicalUrl,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Site with this URL already exists" },
        { status: 400 }
      );
    }

    const site = await prisma.site.create({
      data: {
        name: validated.name,
        url: canonicalUrl,
        userId,
      },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating site:", error);
    return NextResponse.json(
      { error: "Failed to create site" },
      { status: 500 }
    );
  }
}
