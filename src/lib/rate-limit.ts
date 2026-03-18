import { redis } from "./redis";
import { env } from "@/env";
import { format } from "date-fns";
import { createLogger } from "@/lib/logger";

const log = createLogger("RateLimit");

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: Date;
}

export async function checkRateLimit(
  userId: string,
  limit: number = env.RATE_LIMIT_RUNS_PER_DAY,
  keyPrefix: string = "run",
  failOpen = false,
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
    log.error("Rate limit check failed", error, { userId, keyPrefix });
    if (failOpen) {
      return { success: true, remaining: limit, limit, reset: new Date() };
    }
    return { success: false, remaining: 0, limit, reset: new Date() };
  }
}

export async function getQuotaStatus(
  userId: string,
  limit: number,
  keyPrefix: string,
): Promise<RateLimitResult> {
  const today = format(new Date(), "yyyy-MM-dd");
  const key = `rate-limit:${keyPrefix}:${userId}:${today}`;
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  try {
    const raw = await redis.get(key);
    const current = raw ? parseInt(raw, 10) : 0;
    return {
      success: current < limit,
      remaining: Math.max(0, limit - current),
      limit,
      reset: endOfDay,
    };
  } catch {
    // Fail open — don't block rendering on a Redis hiccup
    return { success: true, remaining: limit, limit, reset: endOfDay };
  }
}

/**
 * IP-based rate limiter with a rolling time window.
 * Fails open on Redis error — CLI polling is low-risk and blocking
 * legitimate users during a Redis blip is worse than the risk.
 */
export async function checkIpRateLimit(
  ip: string,
  limit: number,
  windowSeconds: number,
  keyPrefix: string,
): Promise<RateLimitResult> {
  const windowKey = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `rate-limit:${keyPrefix}:${ip}:${windowKey}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    const remaining = Math.max(0, limit - current);
    const reset = new Date(
      Math.ceil(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000,
    );
    return { success: current <= limit, remaining, limit, reset };
  } catch (error) {
    log.error("IP rate limit check failed", error, { ip, keyPrefix });
    // Fail open — don't break the CLI device flow during a Redis blip
    return { success: true, remaining: limit, limit, reset: new Date() };
  }
}
