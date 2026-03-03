import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";
import { format, subDays } from "date-fns";

// GET /api/alerts/dates?severity=critical
// Returns { dates: string[] } — YYYY-MM-DD strings for days with alerts in the last 30 days
export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");

    const thirtyDaysAgo = subDays(new Date(), 30);

    const alerts = await prisma.regressionAlert.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        ...(severity && { severity }),
        run: {
          monitor: {
            site: { userId },
          },
        },
      },
      select: { createdAt: true },
    });

    const dateSet = new Set<string>();
    for (const alert of alerts) {
      dateSet.add(format(alert.createdAt, "yyyy-MM-dd"));
    }

    return NextResponse.json({ dates: Array.from(dateSet) });
  } catch (error) {
    console.error("Error fetching alert dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert dates" },
      { status: 500 },
    );
  }
}
