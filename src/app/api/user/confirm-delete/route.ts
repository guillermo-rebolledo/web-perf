import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDeleteAccountToken } from "@/lib/delete-account-token";

/**
 * POST /api/user/confirm-delete
 *
 * Verifies the deletion confirmation token (from the email link) and
 * permanently deletes the account. Requires an explicit POST so that:
 *  - Link pre-fetchers and email safety scanners (which only send GET) cannot
 *    accidentally trigger the deletion.
 *  - The action is clearly intentional (user clicked "Confirm" in the UI).
 *
 * The token is submitted as a JSON body field, not a query param, to avoid
 * it appearing in server access logs.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token =
    body !== null && typeof body === "object" && "token" in body
      ? String((body as Record<string, unknown>).token)
      : null;

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

  return NextResponse.json({ ok: true });
}
