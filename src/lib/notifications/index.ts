import { prisma } from "@/lib/prisma";
import { dispatch } from "./dispatcher";
import type { IntegrationConfig, NotificationContext } from "./types";

export type { NotificationContext, NotificationRegression, NotificationRun } from "./types";

/**
 * Fan out notifications to all matching integrations for the run's user.
 *
 * "All monitors" convention: if an integration has zero MonitorIntegration rows,
 * it fires for every run. Specific rows restrict it to those monitors only.
 */
export async function fireIntegrations(ctx: NotificationContext): Promise<void> {
  const { run } = ctx;
  const userId = run.monitor.userId;

  const integrations = await prisma.integration.findMany({
    where: { userId, isActive: true },
    include: { monitorIntegrations: { select: { monitorId: true } } },
  });

  const matched = integrations.filter((integration) => {
    const monitorIds = integration.monitorIntegrations.map((mi) => mi.monitorId);
    // Zero rows = fire for all monitors
    return monitorIds.length === 0 || monitorIds.includes(run.monitorId);
  });

  if (matched.length === 0) return;

  const results = await Promise.allSettled(
    matched.map((integration) => {
      const config = integration.config as IntegrationConfig;
      return dispatch(config, ctx).catch((err: unknown) => {
        console.error(
          `[Notifications] Failed to dispatch to integration ${integration.id} (${integration.type}):`,
          err,
        );
        throw err;
      });
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.error(`[Notifications] ${failed}/${matched.length} notification(s) failed`);
  }
}
