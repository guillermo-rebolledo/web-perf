import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/digest/unsubscribe-token";

/**
 * GET /api/digest/unsubscribe?token=<token>
 *
 * One-click unsubscribe endpoint embedded in digest emails.
 * No session required — the HMAC token is the credential.
 * Redirects to /settings?unsubscribed=1 on success.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    return new NextResponse("Invalid or expired unsubscribe token", {
      status: 400,
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { weeklyDigestEnabled: false },
  });

  return NextResponse.redirect(
    new URL("/settings?unsubscribed=1", request.url)
  );
}
