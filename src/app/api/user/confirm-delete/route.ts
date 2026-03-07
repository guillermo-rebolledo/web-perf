import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDeleteAccountToken } from "@/lib/delete-account-token";

/**
 * GET /api/user/confirm-delete?token=...
 * Verifies the deletion confirmation token and permanently deletes the account.
 * Redirects to the homepage on success.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const userId = verifyDeleteAccountToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid or expired token. Request a new deletion link from account settings." },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id: userId } });

  // Redirect to sign-in and clear the JWT session cookie so the browser
  // doesn't remain authenticated. NextAuth v5 uses a JWT strategy, so deleting
  // the user doesn't invalidate the in-browser token automatically.
  const response = NextResponse.redirect(new URL("/auth/signin", request.url));
  // Delete both the plain (dev) and Secure-prefixed (prod HTTPS) variants.
  response.cookies.delete("next-auth.session-token");
  response.cookies.delete("__Secure-next-auth.session-token");
  return response;
}
