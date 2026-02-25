import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const severity = searchParams.get("severity");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const cursor = searchParams.get("cursor");

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const where: Prisma.RegressionAlertWhereInput = {
      createdAt: {
        gte: startDate,
      },
      run: {
        monitor: {
          site: {
            userId: session.user.id,
          },
        },
      },
    };

    if (severity) {
      where.severity = severity;
    }

    // Add cursor condition for pagination
    if (cursor) {
      try {
        const [cursorDate, cursorId] = cursor.split("_");
        where.OR = [
          {
            createdAt: {
              lt: new Date(cursorDate),
            },
          },
          {
            createdAt: new Date(cursorDate),
            id: {
              lt: cursorId,
            },
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
    const nextCursor =
      hasMore && returnedAlerts.length > 0
        ? `${returnedAlerts[returnedAlerts.length - 1].createdAt.toISOString()}_${returnedAlerts[returnedAlerts.length - 1].id}`
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
