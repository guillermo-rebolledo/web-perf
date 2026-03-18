import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { resolveUser } from "@/lib/resolve-user";
import Fuse from "fuse.js";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:sites");

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

/**
 * GET /api/sites/search
 *
 * Searches the authenticated user's sites by name using fuzzy matching.
 *
 * @param q - Required. Search query string (1–100 chars).
 * @param limit - Optional. Max results to return (1–25, default 10).
 *
 * @returns 200 `{ results: { id, name, url }[] }` ordered by relevance.
 * @returns 400 if `q` is missing or fails validation.
 * @returns 401 if the request is unauthenticated.
 * @returns 500 on unexpected error.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const parsed = searchSchema.safeParse({
      q: searchParams.get("q"),
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { q, limit } = parsed.data;

    const sites = await prisma.site.findMany({
      where: { userId },
      select: { id: true, name: true, url: true },
    });

    const fuse = new Fuse(sites, {
      keys: ["name"],
      threshold: 0.4,
    });

    const results = fuse.search(q, { limit }).map((r) => r.item);

    return NextResponse.json({ results });
  } catch (error) {
    log.error("Error searching sites", error);
    return NextResponse.json(
      { error: "Failed to search sites" },
      { status: 500 }
    );
  }
}
