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

  // Redirect to homepage after successful deletion
  return NextResponse.redirect(new URL("/?deleted=1", request.url));
}
