import { redis } from "./redis";
import { env } from "@/env";
import { format } from "date-fns";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: Date;
}

export async function checkRateLimit(
  userId: string,
  limit: number = env.RATE_LIMIT_RUNS_PER_DAY,
  keyPrefix: string = "run"
): Promise<RateLimitResult> {
  const today = format(new Date(), "yyyy-MM-dd");
  const key = `rate-limit:${keyPrefix}:${userId}:${today}`;

  try {
    const current = await redis.incr(key);

    // Set expiry to end of day if this is the first increment
    if (current === 1) {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const secondsUntilEndOfDay = Math.floor(
        (endOfDay.getTime() - now.getTime()) / 1000
      );
      await redis.expire(key, secondsUntilEndOfDay);
    }

    const remaining = Math.max(0, limit - current);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return {
      success: current <= limit,
      remaining,
      limit,
      reset: endOfDay,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow the request if Redis is down
    return {
      success: true,
      remaining: limit,
      limit,
      reset: new Date(),
    };
  }
}

export async function getRateLimitInfo(
  userId: string,
  limit: number = env.RATE_LIMIT_RUNS_PER_DAY,
  keyPrefix: string = "run"
): Promise<RateLimitResult> {
  const today = format(new Date(), "yyyy-MM-dd");
  const key = `rate-limit:${keyPrefix}:${userId}:${today}`;

  try {
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;
    const remaining = Math.max(0, limit - count);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return {
      success: count < limit,
      remaining,
      limit,
      reset: endOfDay,
    };
  } catch (error) {
    console.error("Rate limit info fetch failed:", error);
    return {
      success: true,
      remaining: limit,
      limit,
      reset: new Date(),
    };
  }
}
