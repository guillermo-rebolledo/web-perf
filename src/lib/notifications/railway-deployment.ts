// Block Kit payload builder for Railway deployment webhook notifications.
// This is infrastructure-level — not tied to the per-user notification system.

export interface RailwayWebhookPayload {
  status: string;
  service: { id: string; name: string };
  environment: { id: string; name: string };
  deployment: { id: string; url?: string | null };
  project: { id: string; name: string };
  timestamp: string;
  actor?: { id: string; name: string };
}

const ACTIONABLE_STATUSES = new Set(["SUCCESS", "FAILED", "CRASHED"]);

export function isActionableStatus(status: string): boolean {
  return ACTIONABLE_STATUSES.has(status);
}

export function buildRailwayDeployPayload(payload: RailwayWebhookPayload): unknown {
  const { status, service, environment, deployment, project, timestamp, actor } = payload;

  const isSuccess = status === "SUCCESS";
  const color = isSuccess ? "#22c55e" : "#ef4444";
  const emoji = isSuccess ? "✅" : "❌";
  const label = isSuccess ? "Deployment succeeded" : `Deployment ${status.toLowerCase()}`;

  const fields: unknown[] = [
    { type: "mrkdwn", text: `*Project*\n${project.name}` },
    { type: "mrkdwn", text: `*Service*\n${service.name}` },
    { type: "mrkdwn", text: `*Environment*\n${environment.name}` },
    { type: "mrkdwn", text: `*Triggered by*\n${actor?.name ?? "Railway"}` },
    { type: "mrkdwn", text: `*Deployment ID*\n\`${deployment.id}\`` },
    {
      type: "mrkdwn",
      text: `*Timestamp*\n${new Date(timestamp).toUTCString()}`,
    },
  ];

  if (deployment.url) {
    fields.push({ type: "mrkdwn", text: `*URL*\n${deployment.url}` });
  }

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${label}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields,
    },
  ];

  return {
    text: `${emoji} ${label} — ${project.name} / ${service.name} (${environment.name})`,
    attachments: [
      {
        color,
        blocks,
      },
    ],
  };
}

export async function sendRailwayDeployNotification(
  webhookUrl: string,
  payload: RailwayWebhookPayload,
): Promise<void> {
  const body = buildRailwayDeployPayload(payload);
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook returned ${res.status}: ${await res.text()}`);
  }
}
