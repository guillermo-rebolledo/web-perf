import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { env } from "@/env";
import { processDueMonitors } from "@/worker/scheduler";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:scheduler");

// POST /api/scheduler/tick - Trigger scheduler (protected by secret header)
export async function POST(request: NextRequest) {
  try {
    // Check authorization header using timing-safe comparison to prevent timing oracles
    const authHeader = request.headers.get("x-scheduler-secret");
    const expected = Buffer.from(env.SCHEDULER_SECRET);
    const provided = authHeader ? Buffer.from(authHeader) : null;
    const authorized =
      provided !== null &&
      provided.length === expected.length &&
      timingSafeEqual(provided, expected);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process due monitors
    await processDueMonitors();

    return NextResponse.json({ success: true, message: "Scheduler tick completed" });
  } catch (error) {
    log.error("Error in scheduler tick", error);
    return NextResponse.json(
      { error: "Failed to process scheduler tick" },
      { status: 500 }
    );
  }
}
