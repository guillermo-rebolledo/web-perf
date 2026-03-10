# Feature Flags

Feature flags are managed through [PostHog](https://posthog.com/docs/feature-flags/creating-feature-flags). Flags are evaluated **server-side** in Server Components and API routes using `posthog-node`, which avoids client-side flicker and lets the server gate rendering and endpoints before any HTML is sent.

---

## Key Convention: snake_case

All flag keys in PostHog **must use snake_case** (e.g. `run_ai_summary`). This matches the casing PostHog uses internally and avoids mismatches between what is defined in the dashboard and what is evaluated in code.

---

## Keeping `feature-flags.ts` in Sync

> **Important:** Every flag that exists in the PostHog dashboard must have a matching entry in `src/lib/feature-flags.ts`. This is the single source of truth for flag key strings in the codebase. When you create, rename, or remove a flag in PostHog, update this file immediately.

```ts
// src/lib/feature-flags.ts
export const FEATURE_FLAGS = {
  RUN_AI_SUMMARY: "run_ai_summary",
  PATTERN_INSIGHT: "pattern_insight",
  HEALTH_REPORT: "health_report",
} as const;
```

Never write flag key strings inline — always reference `FEATURE_FLAGS.*`. This makes it trivial to find every usage of a flag via a single import reference.

---

## Files

| File | Purpose |
|---|---|
| `src/lib/feature-flags.ts` | Canonical flag key constants — import in server, API routes, and client |
| `src/lib/posthog-server.ts` | Server-side `isFeatureEnabled()` helper using `posthog-node` |
| `src/env.js` | `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` validation |

---

## Environments (dev vs production)

We use two separate PostHog projects — one for **Development** and one for **Production**. Each project has its own API key and completely independent flag state. Enabling or adjusting a flag in the Development project has zero effect on Production.

### Setup

1. Create two projects in PostHog: `Web Performance Lab – Dev` and `Web Performance Lab – Prod`
2. Create the same flags in both projects, using identical snake_case keys
3. Use the Development project key in `.env.local` and the Production key in production secrets

```env
# .env.local — points to the Development project
NEXT_PUBLIC_POSTHOG_KEY=phc_dev_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Production secrets — points to the Production project
NEXT_PUBLIC_POSTHOG_KEY=phc_prod_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

No code changes are required — `isFeatureEnabled()` uses whichever key is present in `env` at runtime.

### Keeping projects in sync

Since flag definitions are not shared across projects, discipline is required:

- When you add a flag to `src/lib/feature-flags.ts`, create it in **both** projects
- In the Development project, set rollout to 100% so you can develop and test freely
- In the Production project, leave it at 0% until you are ready to release
- When you rename or archive a flag, do it in both projects

### Typical flag lifecycle

1. **Create the flag** in PostHog (snake_case key) and add it to `src/lib/feature-flags.ts`
2. In the **Development** environment, set rollout to 100% (or target yourself) so you can develop freely
3. Leave the **Production** environment at 0% — the feature is invisible to all users
4. When ready to release, gradually roll out in **Production** (e.g. 10% → 50% → 100%)
5. Once fully rolled out and stable, remove the flag check from code and archive the flag in PostHog

### Working locally without PostHog

Both env vars are optional. When they are absent, `isFeatureEnabled()` returns `defaultValue` (default: `true`), so all flagged features remain fully visible in local development without needing a PostHog account at all.

---

## Evaluating a Flag Server-Side

### In a Server Component (e.g. `page.tsx`)

```ts
import { isFeatureEnabled } from "@/lib/posthog-server";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

// Run in parallel with other async work to avoid waterfall
const [data, flagEnabled] = await Promise.all([
  fetchSomeData(),
  isFeatureEnabled(FEATURE_FLAGS.RUN_AI_SUMMARY, session.user.id),
]);
```

Then conditionally render:

```tsx
{flagEnabled && <RunAISummary ... />}
```

### In an API Route

Add a guard after auth/ownership checks and before any expensive work:

```ts
const featureEnabled = await isFeatureEnabled(
  FEATURE_FLAGS.RUN_AI_SUMMARY,
  session.user.id,
  { defaultValue: true }
);
if (!featureEnabled) {
  return new Response(JSON.stringify({ error: "Feature not available" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
```

This acts as a server-side double-check — even if a user calls the endpoint directly, the flag is verified independently of the UI.

---

## `defaultValue` Behaviour

`isFeatureEnabled` accepts an optional `{ defaultValue }` option (default: `true`):

| Scenario | Recommended `defaultValue` |
|---|---|
| PostHog not configured (local dev) | `true` — feature stays visible |
| Flag doesn't exist in PostHog yet | `false` — treat as off until explicitly enabled |
| Critical gate (billing, permissions) | `false` — fail closed |

---

## Active Flags

| Constant | PostHog key | Description |
|---|---|---|
| `FEATURE_FLAGS.RUN_AI_SUMMARY` | `run_ai_summary` | Enables the AI Analysis card on the run detail page |
| `FEATURE_FLAGS.PATTERN_INSIGHT` | `pattern_insight` | Enables cross-run regression pattern analysis (background-generated, `defaultValue: false` in worker) |
| `FEATURE_FLAGS.HEALTH_REPORT` | `health_report` | Enables first-run site health report (background-generated, `defaultValue: false` in worker) |

---

## Further Reading

- [PostHog: Creating feature flags](https://posthog.com/docs/feature-flags/creating-feature-flags)
- [PostHog: Server-side evaluation with `posthog-node`](https://posthog.com/docs/libraries/node)
- [PostHog: Next.js integration guide](https://posthog.com/docs/libraries/next-js)
