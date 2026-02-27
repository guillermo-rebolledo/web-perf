"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { generateApiKey, hashApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export type AuthorizeResult =
  | { ok: true; email: string }
  | { ok: false; reason: "expired" | "already_used" | "unauthenticated" | "server_error" };

export async function authorizeCliLogin(code: string): Promise<AuthorizeResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, reason: "unauthenticated" };
  }

  const redisKey = `cli:login:${code}`;
  const raw = await redis.get(redisKey);

  if (!raw) {
    return { ok: false, reason: "expired" };
  }

  const state = JSON.parse(raw) as { status: string };

  if (state.status === "authorized") {
    return { ok: false, reason: "already_used" };
  }

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  const userAgent = (await headers()).get("user-agent");

  try {
    await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name: "CLI (auto-authorized)",
        keyHash,
        keyPrefix: rawKey.slice(0, 13),
        expiresAt,
        userAgent,
      },
    });

    await redis.set(
      redisKey,
      JSON.stringify({
        status: "authorized",
        apiKey: rawKey,
        email: session.user.email,
      }),
      "EX",
      60
    );

    return { ok: true, email: session.user.email ?? "" };
  } catch {
    return { ok: false, reason: "server_error" };
  }
}
