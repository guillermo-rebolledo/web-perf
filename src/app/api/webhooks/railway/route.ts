import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/env";
import {
  isActionableStatus,
  sendRailwayDeployNotification,
  type RailwayWebhookPayload,
} from "@/lib/notifications/railway-deployment";

// POST /api/webhooks/railway
// Receives Railway deployment webhook events and forwards a Slack notification.
// Auth: Bearer token compared via timing-safe equality against RAILWAY_WEBHOOK_SECRET.
// No DB interaction — pure webhook receiver.
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Graceful no-op: if env vars are not configured, the feature is disabled
  if (!env.RAILWAY_WEBHOOK_SECRET || !env.RAILWAY_SLACK_WEBHOOK_URL) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  // Verify bearer token using timing-safe comparison
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const expected = Buffer.from(env.RAILWAY_WEBHOOK_SECRET, "utf8");
  const received = Buffer.from(token, "utf8");

  const isValid =
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate shape minimally
  if (
    typeof body !== "object" ||
    body === null ||
    !("status" in body) ||
    typeof (body as Record<string, unknown>).status !== "string"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = body as RailwayWebhookPayload;

  // Skip non-actionable statuses (DEPLOYING, REMOVED) to avoid noise
  if (!isActionableStatus(payload.status)) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

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
