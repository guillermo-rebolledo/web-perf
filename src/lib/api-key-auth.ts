import { createHash } from "crypto";
import { customAlphabet } from "nanoid";
import { prisma } from "./prisma";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32
);

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): string {
  return `side_${nanoid()}`;
}

export async function resolveApiKeyUser(rawKey: string): Promise<string | null> {
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!apiKey) return null;

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Fire-and-forget lastUsedAt update
  void prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Non-critical — ignore failures
    });

  return apiKey.userId;
}
