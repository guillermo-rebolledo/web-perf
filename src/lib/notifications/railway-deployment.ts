/**
 * Strips Slack mrkdwn link syntax `<URL|label>` and angle-bracket sequences
 * from a string before it is interpolated into a Block Kit mrkdwn field.
 * Without this, an unauthenticated caller could inject clickable phishing
 * links into operator Slack notifications.
 */
export function sanitizeMrkdwn(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // strip <URL|label> and any other angle-bracket sequences
    .slice(0, 200);          // hard length cap
}

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

  // Sanitize all user-supplied string fields before interpolating into mrkdwn
  // to prevent link injection (e.g. <https://phishing.site|View Dashboard>).
  const safeProject = sanitizeMrkdwn(project.name);
  const safeService = sanitizeMrkdwn(service.name);
  const safeEnvironment = sanitizeMrkdwn(environment.name);
  const safeAuthor = sanitizeMrkdwn(commitAuthor ?? "Railway");

  const fields: unknown[] = [
    { type: "mrkdwn", text: `*Project*\n${safeProject}` },
    { type: "mrkdwn", text: `*Service*\n${safeService}` },
    { type: "mrkdwn", text: `*Environment*\n${safeEnvironment}` },
    { type: "mrkdwn", text: `*Triggered by*\n${safeAuthor}` },
    { type: "mrkdwn", text: `*Deployment ID*\n\`${deployment.id}\`` },
    { type: "mrkdwn", text: `*Timestamp*\n${new Date(timestamp).toUTCString()}` },
  ];

  if (commitHash) {
    const shortHash = commitHash.slice(0, 7);
    const rawMsg = commitMessage ? commitMessage.split("\n")[0] : shortHash;
    const safeMsg = sanitizeMrkdwn(rawMsg);
    fields.push({ type: "mrkdwn", text: `*Commit*\n\`${shortHash}\` ${safeMsg}` });
  }

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} ${label}`, emoji: true },
    },
    { type: "section", fields },
  ];

  return {
    text: `${emoji} ${label} — ${safeProject} / ${safeService} (${safeEnvironment})`,
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
