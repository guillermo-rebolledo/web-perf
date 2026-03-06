import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/resolve-user";

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
