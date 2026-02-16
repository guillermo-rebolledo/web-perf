import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { processDueMonitors } from "@/worker/scheduler";

// POST /api/scheduler/tick - Trigger scheduler (protected by secret header)
export async function POST(request: NextRequest) {
  try {
    // Check authorization header
    const authHeader = request.headers.get("x-scheduler-secret");
    if (!authHeader || authHeader !== env.SCHEDULER_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process due monitors
    await processDueMonitors();

    return NextResponse.json({ success: true, message: "Scheduler tick completed" });
  } catch (error) {
    console.error("Error in scheduler tick:", error);
    return NextResponse.json(
      { error: "Failed to process scheduler tick" },
      { status: 500 }
    );
  }
}
