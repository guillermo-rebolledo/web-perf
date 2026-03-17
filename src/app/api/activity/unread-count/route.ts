import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await resolveUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  if (!since) {
    return NextResponse.json({ count: 0 });
  }

  const sinceDate = new Date(since);
  if (isNaN(sinceDate.getTime())) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.activityEvent.count({
    where: { userId, createdAt: { gt: sinceDate } },
  });

  return NextResponse.json({ count });
}
