import type { IntegrationConfig, NotificationContext } from "./types";
import { sendSlackNotification } from "./slack";

function assertNever(x: never): never {
  throw new Error(`Unknown integration type: ${String(x)}`);
}

export async function dispatch(
  config: IntegrationConfig,
  ctx: NotificationContext,
): Promise<void> {
  switch (config.type) {
    case "slack":
      return sendSlackNotification(config, ctx);
    default:
      assertNever(config.type);
  }
}
