import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";
import { startOfDay, endOfDay, parse } from "date-fns";

export type AlertsApiResponse = {
  alerts: {
    id: string;
    metricName: string;
    baselineValue: number;
    actualValue: number;
    delta: number;
    percentChange: number;
    severity: string;
    confidence: string;
    status: string;
    createdAt: Date;
    run: {
      id: string;
      completedAt: Date | null;
      monitor: {
        id: string;
        site: {
          id: string;
          name: string;
          url: string;
        };
      };
    };
  }[];
  nextCursor: string | null;
  hasMore: boolean;
};

// GET /api/alerts?days=30&severity=critical&limit=20&cursor=...
// GET /api/alerts?date=yyyy-MM-dd&severity=critical&limit=50
export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // "yyyy-MM-dd"
    const days = parseInt(searchParams.get("days") || "30", 10);
    const severity = searchParams.get("severity");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const cursor = searchParams.get("cursor");

    // Build where clause
    const where: Prisma.RegressionAlertWhereInput = {
      run: {
        monitor: {
          site: {
            userId,
          },
        },
      },
    };

    // Date filtering: specific day window or rolling N-day window
    if (dateParam) {
      const day = parse(dateParam, "yyyy-MM-dd", new Date());
      where.createdAt = { gte: startOfDay(day), lte: endOfDay(day) };
    } else {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      where.createdAt = { gte: startDate };
    }

    if (severity) {
      where.severity = severity;
    }

    // Add cursor condition for pagination
    if (cursor) {
      try {
        const parts = cursor.split("_");
        const [cursorSeverity, cursorDate, cursorId] = parts;
        if (parts.length !== 3 || !cursorSeverity || !cursorDate || !cursorId) {
          throw new Error("Invalid cursor");
        }
        where.OR = [
          { severity: { lt: cursorSeverity } },
          { severity: cursorSeverity, createdAt: { lt: new Date(cursorDate) } },
          {
            severity: cursorSeverity,
            createdAt: new Date(cursorDate),
            id: { lt: cursorId },
          },
        ];
      } catch {
        return NextResponse.json(
          { error: "Invalid cursor format" },
          { status: 400 }
        );
      }
    }

    // Fetch alerts with cursor-based pagination
    const alerts = await prisma.regressionAlert.findMany({
      where,
      include: {
        run: {
          include: {
            monitor: {
              include: {
                site: true,
              },
            },
          },
        },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: limit + 1, // Fetch one extra to determine if there are more
    });

    // Check if there are more results
    const hasMore = alerts.length > limit;
    const returnedAlerts = hasMore ? alerts.slice(0, limit) : alerts;

    // Generate next cursor from the last returned alert
    // Format: severity_createdAt_id (all 3 sort keys must be encoded)
    const nextCursor =
      hasMore && returnedAlerts.length > 0
        ? `${returnedAlerts[returnedAlerts.length - 1].severity}_${returnedAlerts[returnedAlerts.length - 1].createdAt.toISOString()}_${returnedAlerts[returnedAlerts.length - 1].id}`
        : null;

    return NextResponse.json({
      alerts: returnedAlerts,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
