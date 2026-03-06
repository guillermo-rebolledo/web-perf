import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";

/**
 * GET /api/user/export
 * Returns a JSON dump of all data belonging to the authenticated user.
 * GDPR Art. 20 — Right to data portability.
 *
 * Excludes: raw screenshot data (large binary), OAuth tokens, session tokens,
 * and hashed API keys (not portable).
 */
export async function GET(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      weeklyDigestEnabled: true,
      sites: {
        select: {
          id: true,
          name: true,
          url: true,
          createdAt: true,
          monitors: {
            select: {
              id: true,
              strategy: true,
              cadenceMinutes: true,
              triggerType: true,
              isActive: true,
              createdAt: true,
              runs: {
                select: {
                  id: true,
                  status: true,
                  queuedAt: true,
                  startedAt: true,
                  completedAt: true,
                  errorMessage: true,
                  performanceScore: true,
                  accessibilityScore: true,
                  bestPracticesScore: true,
                  seoScore: true,
                  lcp: true,
                  inp: true,
                  tbt: true,
                  cls: true,
                  fcp: true,
                  ttfb: true,
                  finalUrl: true,
                  lighthouseVersion: true,
                  regressionAlerts: {
                    select: {
                      id: true,
                      metricName: true,
                      baselineValue: true,
                      actualValue: true,
                      percentChange: true,
                      severity: true,
                      status: true,
                      createdAt: true,
                    },
                  },
                },
                orderBy: { queuedAt: "desc" },
                take: 1000,
              },
            },
          },
        },
      },
      integrations: {
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          createdAt: true,
          // Omit config to avoid exposing webhook URLs
        },
      },
      apiKeys: {
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
          // Omit keyHash — not portable
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: "1",
    note: "Includes the most recent 1,000 runs per monitor.",
    user,
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="perflabs-export-${userId}.json"`,
      "Cache-Control": "no-store, private",
    },
  });
}
