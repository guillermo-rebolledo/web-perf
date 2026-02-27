import { type NextRequest } from "next/server";
import { auth } from "./auth";
import { resolveApiKeyUser } from "./api-key-auth";

/**
 * Resolves the authenticated user from a request.
 * Checks Bearer API key first, falls back to NextAuth session.
 * Returns userId string or null if unauthenticated.
 */
export async function resolveUser(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return resolveApiKeyUser(authHeader.slice(7));
  }

  const session = await auth();
  return session?.user?.id ?? null;
}
