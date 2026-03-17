import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";
import type { ActivityApiResponse } from "@/types/api";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(Math.max(1, rawLimit), 100);
  const cursor = searchParams.get("cursor");
  const typeFilter = searchParams.get("type");

  let cursorWhere = {};
  if (cursor) {
    const idx = cursor.indexOf("_");
    if (idx === -1) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const cursorDate = cursor.slice(0, idx);
    const cursorId = cursor.slice(idx + 1);
    if (!cursorDate || !cursorId) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const parsedDate = new Date(cursorDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    cursorWhere = {
      OR: [
        { createdAt: { lt: parsedDate } },
        { createdAt: parsedDate, id: { lt: cursorId } },
      ],
    };
  }

  const events = await prisma.activityEvent.findMany({
    where: {
      userId: user,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...cursorWhere,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = events.length > limit;
  const page = hasMore ? events.slice(0, limit) : events;
  const nextCursor = hasMore
    ? `${page[page.length - 1].createdAt.toISOString()}_${page[page.length - 1].id}`
    : null;

  const response: ActivityApiResponse = {
    events: page.map((e) => ({
      id: e.id,
      type: e.type,
      entityId: e.entityId,
      entityType: e.entityType,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    })),
    nextCursor,
    hasMore,
  };

  return NextResponse.json(response);
}
