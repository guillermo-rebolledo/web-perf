import { prisma } from "@/lib/prisma";
import { aggregateUserDigest } from "@/lib/digest/aggregator";
import { sendDigestEmail } from "@/lib/digest/sender";
import { createLogger } from "@/lib/logger";

const log = createLogger("Digest");

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

  log.info("Processing opted-in users", { count: users.length });

  for (const user of users) {
    try {
      const data = await aggregateUserDigest(user.id);

      if (!data || data.sites.length === 0) {
        log.debug("Skipping user — no data this week", { userId: user.id });
        continue;
      }

      await sendDigestEmail(data);
      log.info("Digest sent", { userId: user.id });
    } catch (err) {
      // Log and continue — one failure must not block the rest
      log.error("Failed to send digest", err, { userId: user.id });
    }
  }

  log.info("Digest job complete");
}
