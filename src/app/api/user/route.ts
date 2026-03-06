import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";
import { env } from "@/env";
import { generateDeleteAccountToken } from "@/lib/delete-account-token";
import { Resend } from "resend";

const patchSchema = z.object({
  weeklyDigestEnabled: z.boolean(),
});

/**
 * PATCH /api/user
 * Updates current user's preferences. Currently supports:
 *   - weeklyDigestEnabled (boolean)
 */
export async function PATCH(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, email: true, weeklyDigestEnabled: true },
  });

  return NextResponse.json(user);
}

/**
 * DELETE /api/user
 * Initiates account deletion. If Resend is configured, sends a confirmation
 * email with a 24-hour expiry token and returns 202 Accepted. The actual
 * deletion happens at GET /api/user/confirm-delete?token=...
 *
 * If Resend is not configured, deletes immediately (dev/testing fallback).
 *
 * GDPR Art. 17 — Right to erasure.
 */
export async function DELETE(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (env.RESEND_API_KEY) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const token = generateDeleteAccountToken(userId);
    const appUrl = env.NEXTAUTH_URL;
    const confirmUrl = `${appUrl}/api/user/confirm-delete?token=${token}`;

    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      subject: "Confirm account deletion — PerfLabs",
      html: `
        <p>Hi${user.name ? ` ${user.name}` : ""},</p>
        <p>We received a request to permanently delete your PerfLabs account and all associated data.</p>
        <p>If you requested this, click the link below to confirm. This link expires in 24 hours.</p>
        <p><a href="${confirmUrl}">Confirm account deletion</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>— The PerfLabs team</p>
      `,
    });

    return NextResponse.json(
      { message: "Confirmation email sent. Check your inbox to complete deletion." },
      { status: 202 },
    );
  }

  // No email provider configured — delete immediately (dev/self-hosted fallback)
  await prisma.user.delete({ where: { id: userId } });
  return new NextResponse(null, { status: 204 });
}
