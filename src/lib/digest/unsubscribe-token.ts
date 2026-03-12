import { createHmac } from "crypto";
import { env } from "@/env";

const SCOPE = "digest-unsubscribe";

/**
 * Generates a URL-safe base64 HMAC token for one-click unsubscribe.
 * Token format (base64url): `<userId>:<hmac-hex>`
 */
export function generateUnsubscribeToken(userId: string): string {
  const sig = sign(`${userId}:${SCOPE}`);
  return Buffer.from(`${userId}:${sig}`).toString("base64url");
}

/**
 * Verifies a token produced by {@link generateUnsubscribeToken}.
 * Returns the userId if the token is valid, or null if tampered/malformed.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const colonIdx = decoded.lastIndexOf(":");
    if (colonIdx === -1) return null;

    const userId = decoded.slice(0, colonIdx);
    const providedSig = decoded.slice(colonIdx + 1);
    const expectedSig = sign(`${userId}:${SCOPE}`);

    // Constant-time comparison to prevent timing attacks
    if (providedSig.length !== expectedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < providedSig.length; i++) {
      diff |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    return diff === 0 ? userId : null;
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  const secret = env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for signing unsubscribe tokens");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}
