import { createHmac } from "crypto";
import { env } from "@/env";

const SCOPE = "account-delete";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates a URL-safe base64 HMAC token for account deletion confirmation.
 * Token format (base64url): `<userId>:<issuedAt>:<hmac-hex>`
 */
export function generateDeleteAccountToken(userId: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}:${issuedAt}:${SCOPE}`;
  const sig = sign(payload);
  return Buffer.from(`${userId}:${issuedAt}:${sig}`).toString("base64url");
}

/**
 * Verifies a token produced by {@link generateDeleteAccountToken}.
 * Returns the userId if the token is valid and unexpired, or null otherwise.
 */
export function verifyDeleteAccountToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length < 3) return null;

    // Last part is sig, second-to-last is issuedAt, everything before is userId
    const sig = parts[parts.length - 1];
    const issuedAt = Number(parts[parts.length - 2]);
    const userId = parts.slice(0, parts.length - 2).join(":");

    if (!userId || isNaN(issuedAt)) return null;

    // Check expiry
    if (Date.now() - issuedAt > EXPIRY_MS) return null;

    const expectedSig = sign(`${userId}:${issuedAt}:${SCOPE}`);

    // Constant-time comparison
    if (sig.length !== expectedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    return diff === 0 ? userId : null;
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  const secret = env.NEXTAUTH_SECRET ?? "dev-secret-not-for-production";
  return createHmac("sha256", secret).update(payload).digest("hex");
}
