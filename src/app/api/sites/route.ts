import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canonicalizeUrl } from "@/lib/url-utils";

const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

// GET /api/sites - List user's sites (request not needed for list)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by Next.js route signature
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sites = await prisma.site.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        monitors: {
          include: {
            runs: {
              where: {
                status: "success",
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createSiteSchema.parse(body);

    // Canonicalize URL
    const canonicalUrl = canonicalizeUrl(validated.url);

    // Check if site already exists for this user
    const existing = await prisma.site.findFirst({
      where: {
        userId: session.user.id,
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
        userId: session.user.id,
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
