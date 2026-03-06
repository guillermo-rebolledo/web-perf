import { prisma } from "@/lib/prisma";
import { aggregateUserDigest } from "@/lib/digest/aggregator";
import { sendDigestEmail } from "@/lib/digest/sender";

/**
 * BullMQ job handler for the weekly digest.
 *
 * Queries all opted-in users, aggregates their weekly data, and sends
 * each email individually. Per-user failures are caught and logged so
 * the job doesn't abort early — all other users still get their digest.
 */
export async function processDigestJob(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { weeklyDigestEnabled: true },
    select: { id: true, email: true },
  });

  console.log(`[Digest] Processing ${users.length} opted-in user(s)`);

  for (const user of users) {
    try {
      const data = await aggregateUserDigest(user.id);

      if (!data || data.sites.length === 0) {
        console.log(`[Digest] Skipping ${user.email} — no data this week`);
        continue;
      }

      await sendDigestEmail(data);
      console.log(`[Digest] Sent to ${user.email}`);
    } catch (err) {
      // Log and continue — one failure must not block the rest
      console.error(`[Digest] Failed for ${user.email}:`, err);
    }
  }

  console.log("[Digest] Job complete");
}
