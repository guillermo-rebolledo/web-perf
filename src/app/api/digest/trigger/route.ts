import { NextResponse } from "next/server";
import { env } from "@/env";

/**
 * POST /api/digest/trigger
 *
 * Development-only endpoint to immediately run the digest processor.
 * Blocked in production. Useful for testing without waiting for Monday 9 AM.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/digest/trigger
 */
export async function POST() {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  // Dynamic import keeps this out of the production bundle
  const { processDigestJob } = await import("@/worker/digest-processor");

  try {
    await processDigestJob();
    return NextResponse.json({ ok: true, message: "Digest job completed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
