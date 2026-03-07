import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  isActionableStatus,
  sendRailwayDeployNotification,
  type RailwayWebhookPayload,
} from "@/lib/notifications/railway-deployment";

// POST /api/webhooks/railway
// Receives Railway deployment webhook events and forwards a Slack notification.
// No auth: Railway's webhook dashboard does not support secret tokens.
// No DB interaction — pure webhook receiver.
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Graceful no-op: if env var is not configured, the feature is disabled
  if (!env.RAILWAY_SLACK_WEBHOOK_URL) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Extract status from body.details.status — Railway nests it there, not top-level.
  // Treat missing/unrecognised payloads (e.g. Railway test pings) as a no-op.
  const status =
    typeof body === "object" &&
    body !== null &&
    "details" in body &&
    typeof (body as Record<string, unknown>).details === "object" &&
    (body as Record<string, unknown>).details !== null &&
    "status" in ((body as Record<string, unknown>).details as object) &&
    typeof ((body as Record<string, Record<string, unknown>>).details).status === "string"
      ? ((body as Record<string, Record<string, unknown>>).details).status as string
      : null;

  if (!status || !isActionableStatus(status)) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  const payload = body as RailwayWebhookPayload;

  try {
    await sendRailwayDeployNotification(env.RAILWAY_SLACK_WEBHOOK_URL, payload);
  } catch (error) {
    console.error("Failed to send Railway deploy Slack notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
