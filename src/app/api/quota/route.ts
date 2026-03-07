import { type NextRequest } from "next/server";
import { resolveUser } from "@/lib/resolve-user";
import { getQuotaStatus } from "@/lib/rate-limit";
import { env } from "@/env";

export async function GET(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [manual, scheduled] = await Promise.all([
    getQuotaStatus(userId, env.RATE_LIMIT_RUNS_PER_DAY, "run"),
    getQuotaStatus(userId, env.RATE_LIMIT_SCHEDULED_RUNS_PER_DAY, "scheduled"),
  ]);

  return Response.json({ manual, scheduled });
}
