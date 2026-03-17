import { PrismaClient } from "@prisma/client";

export type ActivityEventType =
  | "site_created"
  | "monitor_created"
  | "run_completed"
  | "run_failed"
  | "regression_detected"
  | "deployment_run_triggered";

export type ActivityEventMetadata =
  | { type: "site_created"; siteName: string; siteUrl: string }
  | { type: "monitor_created"; siteName: string; siteUrl: string; siteId: string; strategy: string; triggerType: string }
  | { type: "run_completed"; siteName: string; siteUrl: string; siteId: string; monitorId: string; performanceScore: number | null }
  | { type: "run_failed"; siteName: string; siteUrl: string; siteId: string; monitorId: string; errorMessage: string | null }
  | { type: "regression_detected"; siteName: string; siteUrl: string; siteId: string; alertCount: number; severities: string[] }
  | { type: "deployment_run_triggered"; siteName: string; siteUrl: string; siteId: string; monitorId: string; githubRepo: string | null; githubBranch: string | null };

export const ENTITY_TYPE_MAP: Record<ActivityEventType, "run" | "site" | "monitor"> = {
  site_created: "site",
  monitor_created: "monitor",
  run_completed: "run",
  run_failed: "run",
  regression_detected: "run",
  deployment_run_triggered: "run",
};

export async function recordActivity(
  prisma: PrismaClient,
  userId: string,
  eventType: ActivityEventType,
  entityId: string,
  metadata: ActivityEventMetadata,
): Promise<void> {
  await prisma.activityEvent.create({
    data: {
      userId,
      type: eventType,
      entityId,
      entityType: ENTITY_TYPE_MAP[eventType],
      metadata: metadata as object,
    },
  });
}
