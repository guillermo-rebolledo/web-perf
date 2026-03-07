// Block Kit payload builder for Railway deployment webhook notifications.
// This is infrastructure-level — not tied to the per-user notification system.
//
// Actual Railway webhook shape (confirmed from production logs):
// {
//   type: "Deployment.deployed",
//   details: { id, status: "SUCCESS"|"FAILED"|"CRASHED", commitAuthor, commitMessage, commitHash, ... },
//   resource: { project: { id, name }, service: { id, name }, environment: { id, name }, deployment: { id } },
//   timestamp: "<ISO string>",
// }

export interface RailwayWebhookPayload {
  type: string;
  timestamp: string;
  details: {
    id: string;
    status: string;
    commitAuthor?: string;
    commitMessage?: string;
    commitHash?: string;
  };
  resource: {
    project: { id: string; name: string };
    service: { id: string; name: string };
    environment: { id: string; name: string };
    deployment: { id: string };
  };
}

const ACTIONABLE_STATUSES = new Set(["SUCCESS", "FAILED", "CRASHED"]);

export function isActionableStatus(status: string): boolean {
  return ACTIONABLE_STATUSES.has(status);
}

export function buildRailwayDeployPayload(payload: RailwayWebhookPayload): unknown {
  const { details, resource, timestamp } = payload;
  const { status, commitAuthor, commitMessage, commitHash } = details;
  const { project, service, environment, deployment } = resource;

  const isSuccess = status === "SUCCESS";
  const color = isSuccess ? "#22c55e" : "#ef4444";
  const emoji = isSuccess ? "✅" : "❌";
  const label = isSuccess ? "Deployment succeeded" : `Deployment ${status.toLowerCase()}`;

  const fields: unknown[] = [
    { type: "mrkdwn", text: `*Project*\n${project.name}` },
    { type: "mrkdwn", text: `*Service*\n${service.name}` },
    { type: "mrkdwn", text: `*Environment*\n${environment.name}` },
    { type: "mrkdwn", text: `*Triggered by*\n${commitAuthor ?? "Railway"}` },
    { type: "mrkdwn", text: `*Deployment ID*\n\`${deployment.id}\`` },
    { type: "mrkdwn", text: `*Timestamp*\n${new Date(timestamp).toUTCString()}` },
  ];

  if (commitHash) {
    const shortHash = commitHash.slice(0, 7);
    const msg = commitMessage ? commitMessage.split("\n")[0] : shortHash;
    fields.push({ type: "mrkdwn", text: `*Commit*\n\`${shortHash}\` ${msg}` });
  }

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} ${label}`, emoji: true },
    },
    { type: "section", fields },
  ];

  return {
    text: `${emoji} ${label} — ${project.name} / ${service.name} (${environment.name})`,
    attachments: [{ color, blocks }],
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
