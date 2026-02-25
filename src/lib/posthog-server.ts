import { PostHog } from "posthog-node";
import { env } from "@/env";

/**
 * Creates a short-lived PostHog Node client for use in Server Components and
 * API routes. Returns null when PostHog env vars are not configured so the
 * caller can decide on a sensible default.
 *
 * Always call `client.shutdown()` after use — required in serverless environments
 * to flush pending events before the function exits.
 */
function createPostHogClient(): PostHog | null {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY || !env.NEXT_PUBLIC_POSTHOG_HOST) return null;
  return new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    // Flush immediately — don't batch in serverless contexts
    flushAt: 1,
    flushInterval: 0,
  });
}

/**
 * Evaluates a feature flag server-side for a given user.
 *
 * Falls back to `defaultValue` when PostHog is not configured (e.g. local dev
 * without env vars set). Defaults to `true` so features remain visible during
 * development.
 */
export async function isFeatureEnabled(
  flag: string,
  distinctId: string,
  { defaultValue = true }: { defaultValue?: boolean } = {}
): Promise<boolean> {
  const client = createPostHogClient();
  if (!client) return defaultValue;

  try {
    const result = await client.isFeatureEnabled(flag, distinctId);
    // PostHog returns `undefined` when the flag doesn't exist yet — treat as disabled
    return result ?? false;
  } finally {
    // Must be awaited to ensure the client shuts down cleanly in serverless
    await client.shutdown();
  }
}
