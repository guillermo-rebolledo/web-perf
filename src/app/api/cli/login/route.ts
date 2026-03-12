import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { redis } from "@/lib/redis";
import { env } from "@/env";
import { checkIpRateLimit } from "@/lib/rate-limit";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

const TTL_SECONDS = 600; // 10 minutes

/**
 * POST /api/cli/login — start device flow.
 * No auth required. Generates a short login code and stores pending state in Redis.
 */
export async function POST(_request: NextRequest) {
  try {
    const loginCode = nanoid();
    const redisKey = `cli:login:${loginCode}`;

    await redis.set(
      redisKey,
      JSON.stringify({ status: "pending" }),
      "EX",
      TTL_SECONDS
    );

    const baseUrl = env.NEXTAUTH_URL ?? "";
    const authorizeUrl = `${baseUrl}/cli/authorize?code=${loginCode}`;

    return NextResponse.json({
      loginCode,
      authorizeUrl,
      expiresInSeconds: TTL_SECONDS,
    });
  } catch (error) {
    console.error("Error starting CLI login:", error);
    return NextResponse.json(
      { error: "Failed to start login flow" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cli/login?code=XXXX — poll authorization status.
 * No auth required. Returns pending/authorized/expired.
 * On "authorized", deletes the Redis key (single-use).
 */
export async function GET(request: NextRequest) {
  try {
    // Prefer x-real-ip (set by the infrastructure proxy and not spoofable by
    // clients) over x-forwarded-for where the client-supplied segment comes
    // first and can be forged to bypass or flood a victim's rate limit bucket.
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
      "unknown";

    const ipLimit = await checkIpRateLimit(ip, 60, 60, "cli-poll");
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const redisKey = `cli:login:${code}`;
    const raw = await redis.get(redisKey);

    if (!raw) {
      return NextResponse.json({ status: "expired" });
    }

    const state = JSON.parse(raw) as {
      status: "pending" | "authorized";
      apiKey?: string;
      email?: string;
    };

    if (state.status === "authorized") {
      // Single-use — delete immediately
      await redis.del(redisKey);
      return NextResponse.json({
        status: "authorized",
        apiKey: state.apiKey,
        email: state.email,
      });
    }

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    console.error("Error polling CLI login:", error);
    return NextResponse.json(
      { error: "Failed to check login status" },
      { status: 500 }
    );
  }
}
