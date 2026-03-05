# Notifications Architecture

This document describes the internal design of the notification subsystem — intended for contributors who want to understand the implementation, debug a failure, or add a new provider.

---

## Overview

After each successful audit the worker fans out notifications to all matching integrations for the monitor's owner. The first (and currently only) provider is Slack via Incoming Webhooks, but the architecture is designed so that adding Discord, Teams, or a custom HTTP endpoint requires changes to only three small files with no database migration.

---

## Data model

### `Integration`

Stores one row per connected notification channel.

```prisma
model Integration {
  id        String   @id @default(cuid())
  userId    String
  name      String                         // display label, e.g. "Slack #perf-alerts"
  type      String                         // "slack" | future providers
  config    Json                           // provider-specific config (see below)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user                User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  monitorIntegrations MonitorIntegration[]

  @@index([userId])
  @@index([userId, isActive])
}
```

**`config` column:** A `Json` field that holds provider-specific configuration. For Slack:

```json
{ "type": "slack", "webhookUrl": "https://hooks.slack.com/services/..." }
```

The `type` discriminant inside `config` must always match the `type` column on the row — this is enforced by the API validation layer (Zod schema). The `Json` column was chosen deliberately over a typed column per provider so that new providers can be added without a DB migration. The trade-off is that the shape isn't enforced by the DB — it is enforced in code by the `IntegrationConfig` discriminated union in `src/lib/notifications/types.ts`.

> **Security note:** The `config.webhookUrl` is stored plaintext (like a password). It is never returned to the client by any API endpoint — `GET /api/integrations` returns only `id`, `name`, `type`, `isActive`, `monitorCount`, and `createdAt`.

### `MonitorIntegration`

A join table that restricts which monitors an integration fires for.

```prisma
model MonitorIntegration {
  integrationId String
  monitorId     String
  createdAt     DateTime @default(now())

  integration Integration @relation(...)
  monitor     Monitor     @relation(...)

  @@id([integrationId, monitorId])
}
```

**"All monitors" convention:** If an integration has **zero rows** in this table, it fires for every monitor owned by the user. If it has one or more rows, it fires only for those specific monitors. This avoids a nullable `scope` column and makes the common case (notify for everything) the cheapest DB state.

---

## Module layout

```
src/lib/notifications/
├── types.ts            — shared interfaces; no dependencies
├── slack.ts            — Slack adapter (payload builder + send helpers)
├── dispatcher.ts       — routes by config.type; add a case here per new provider
├── deduplication.ts    — filterNewRegressions(); suppresses repeat notifications
└── index.ts            — public entry point used by the worker
```

### `types.ts`

Pure TypeScript — no imports from the app. Defines:

- `NotificationContext` — everything the worker passes to the notification layer: the run (with embedded monitor + site), any regressions detected in this run, and the app base URL for building deep-links.
- `NotificationRun` / `NotificationRegression` — sub-shapes of `NotificationContext`.
- `IntegrationConfig` — a discriminated union keyed on `type`. Currently a single-member union:

```typescript
export type IntegrationConfig = {
  type: "slack";
  webhookUrl: string;
};
```

Adding a new provider means extending this union:

```typescript
export type IntegrationConfig =
  | { type: "slack"; webhookUrl: string }
  | { type: "discord"; webhookUrl: string }
  | { type: "webhook"; url: string; secret?: string };
```

TypeScript's exhaustive check in `dispatcher.ts` will then produce a compile error until you handle the new case.

### `slack.ts`

Contains three exported functions:

**`buildSlackPayload(ctx: NotificationContext)`**

Assembles a Slack [Block Kit](https://api.slack.com/block-kit) message. The structure is:

```
attachments[0]
  └── color        ← green / orange / red based on regression severity
  └── blocks
        ├── header block     ← score emoji + site name
        ├── section block    ← 8-field metrics grid (score, strategy, LCP, CLS, INP, FCP, TTFB, completedAt)
        ├── section block    ← regressions list (omitted when empty)
        └── actions block    ← "View Run →" button

text (outer field)  ← mobile push fallback
```

The `attachments` wrapper (rather than top-level `blocks`) is intentional — only attachments support the `color` sidebar stripe in the Slack UI. Top-level blocks do not.

**`sendSlackNotification(config, ctx)`**

POSTs the payload to `config.webhookUrl`. Throws on any non-2xx response (including `400 invalid_payload` and `403 action_prohibited`). The caller (`dispatcher.ts` → `fireIntegrations`) catches and logs this error; it never bubbles to the worker job.

**`sendSlackTestMessage(webhookUrl)`**

Sends a minimal verification message. Called by `POST /api/integrations/[id]/test`. Throws on non-2xx.

### `dispatcher.ts`

A thin routing layer. Its only job is to map a `config.type` to its send function:

```typescript
export async function dispatch(config: IntegrationConfig, ctx: NotificationContext) {
  switch (config.type) {
    case "slack":
      return sendSlackNotification(config, ctx);
    default:
      assertNever(config.type); // compile error if a union member is unhandled
  }
}
```

`assertNever` takes a `never`-typed argument and throws at runtime if somehow reached. Because `config.type` is a literal union, TypeScript narrows it to `never` in the `default` branch — so forgetting to add a `case` for a new provider is a **compile error**, not a runtime surprise.

### `deduplication.ts`

Exports a single async function:

```typescript
filterNewRegressions(
  monitorId: string,
  currentRunId: string,
  regressions: NotificationRegression[],
  prismaClient: PrismaClient,
): Promise<NotificationRegression[]>
```

**Suppression rules:**

| Condition | Result |
|---|---|
| No prior unresolved alert for metric M | Passes through (new regression) |
| Prior alert exists at same or higher severity | Suppressed |
| Prior alert exists at lower severity | Suppressed |
| Prior alert exists at lower severity AND new is strictly higher | Passes through (escalation) |
| Prior alert was resolved (not returned by query) | Passes through (recurrence) |

**Severity ranking** (`SEVERITY_RANK`):

| Severity | Rank |
|---|---|
| `minor` | 0 |
| `moderate` | 1 |
| `critical` | 2 |
| unknown / unrecognized | -1 (any known severity escalates) |

**Key implementation details:**

- `runId: { not: currentRunId }` excludes the current run's own alerts from the query — the current run's alerts are already saved in the DB when the notification IIFE fires, so without this exclusion they would suppress themselves on first occurrence.
- `status: { not: "resolved" }` means resolved alerts are excluded; a metric whose alert was resolved and then regresses again will fire a fresh notification.
- Only `metricName` and `severity` are selected — minimal query footprint.
- Returns `[]` immediately (no DB query) when `regressions` is empty.

### `index.ts`

Exports `fireIntegrations(ctx)` — the only function the worker imports. Its steps:

1. Query all `isActive` integrations for the run's `userId`, including their `MonitorIntegration` join rows.
2. Filter to those that match the current `monitorId` (or have zero join rows = "all monitors").
3. If none match, return immediately.
4. `Promise.allSettled` over all matched integrations, calling `dispatch(config, ctx)` for each.
5. Log how many failed; individual failures don't block others.

`Promise.allSettled` is used instead of `Promise.all` so that one bad webhook URL never prevents other integrations from firing.

---

## Worker hook

The notification dispatch is added to `src/worker/processor.ts` **after** regression detection, as a fire-and-forget IIFE:

```typescript
// Notifications (fire-and-forget — never blocks job completion)
void (async () => {
  try {
    const { fireIntegrations } = await import("@/lib/notifications");
    const { filterNewRegressions } = await import("@/lib/notifications/deduplication");
    const runWithSite = await prisma.run.findUnique({ ... });
    if (!runWithSite?.monitor?.site) return;

    const newRegressions = await filterNewRegressions(
      monitorId, runId, runWithSite.regressionAlerts, prisma,
    );

    // Skip notification if all regressions are already open/acknowledged
    if (runWithSite.regressionAlerts.length > 0 && newRegressions.length === 0) {
      console.log(`[Notifications] All N regression(s) suppressed for run ${runId}`);
      return;
    }

    await fireIntegrations({ run, regressions: newRegressions, appBaseUrl });
  } catch (err) {
    console.error("[Worker] Notification dispatch error:", err);
  }
})();
```

**Why fire-and-forget?**

- A slow or broken webhook should never delay the `lastRunAt` update or cause the BullMQ job to fail and retry.
- The same pattern is already used for `calculateBaselines` on line ~196.
- Slack Incoming Webhooks are highly reliable (99.9%+). The Test button surfaces failures without needing retry infrastructure in V1.

**Why a second DB fetch?**

The notification IIFE re-fetches the run including `monitor.site` and the fresh `regressionAlerts`. This is intentional:

- The transaction that saves run metrics completes before this IIFE starts, so the data is guaranteed to be in the DB.
- The fetch includes `regressionAlerts` filtered to `createdAt >= now - 60s` to capture only the alerts created by *this* run (not historical ones).
- The extra query runs after the job's critical path and does not add perceptible latency to the audit.

**Deduplication guard:**

After fetching `regressionAlerts`, the IIFE calls `filterNewRegressions` before `fireIntegrations`. If the run detected regressions but all were suppressed (all metrics already have open/acknowledged alerts), the IIFE logs a suppression message and returns early — no Slack message is sent. Healthy runs (zero regressions) bypass this guard entirely, so "Audit Complete" notifications are unaffected.

---

## API routes

### `GET /api/integrations`

Returns all integrations for the authenticated user. **Never returns `config.webhookUrl`** — the response includes only display-safe fields (`id`, `name`, `type`, `isActive`, `monitorCount`, `createdAt`).

`monitorCount` is the count of `MonitorIntegration` rows for that integration. `0` means "all monitors".

### `POST /api/integrations`

Validates the request body with Zod (`name`, `type: "slack"`, `webhookUrl: url()`, optional `monitorIds`). If `monitorIds` are provided, verifies each one belongs to the authenticated user before inserting. Creates the `Integration` and any `MonitorIntegration` rows in a single Prisma call.

### `PATCH /api/integrations/[id]`

Ownership-checked (returns 404 if the integration belongs to another user). Updates `name`, `isActive`, and/or `config.webhookUrl` in the `Integration` row. If `monitorIds` is provided, **replaces** all existing join rows inside a `$transaction`:

```typescript
await tx.monitorIntegration.deleteMany({ where: { integrationId: id } });
await tx.monitorIntegration.createMany({ data: monitorIds.map(...) });
```

Passing `monitorIds: []` reverts to "all monitors" (zero rows).

### `DELETE /api/integrations/[id]`

Ownership-checked. Cascade-deletes all `MonitorIntegration` rows via the Prisma `onDelete: Cascade` relation.

### `POST /api/integrations/[id]/test`

Ownership-checked. Calls `sendSlackTestMessage(config.webhookUrl)`. **Always returns HTTP 200** — the result is signaled in the body as `{ ok: boolean, error?: string }`. This pattern is intentional: a `4xx` response from a test endpoint would be confusing because the HTTP error could be from PerfLab or from Slack.

---

## Settings page

`src/app/(app)/settings/page.tsx` fetches integrations, monitors, and API keys in **parallel** using `Promise.all`:

```typescript
const [keys, integrations, monitors] = await Promise.all([
  prisma.apiKey.findMany(...),
  prisma.integration.findMany({ include: { _count: { select: { monitorIntegrations: true } } } }),
  prisma.monitor.findMany({ include: { site: { select: { name: true } } } }),
]);
```

The monitor list is passed down to `IntegrationsManager` → `IntegrationDialog` for the scope selector. All three queries are server-side; the client never touches Prisma.

---

## UI components

### `IntegrationsManager` (`src/components/integrations-manager.tsx`)

Client component. Mirrors `ApiKeyManager` in structure. Manages local state for the integration list and handles:

- Opening the create/edit dialog
- Test connection (calls `/api/integrations/[id]/test`, reads `{ ok, error }`)
- Toggle active (`PATCH` with `{ isActive: !current }`)
- Delete (`DELETE`, removes row from local state on success)

Uses `sonner` for toast feedback.

### `IntegrationDialog` (`src/components/integration-dialog.tsx`)

Client component. Uses `react-hook-form` + `zodResolver` for validation. Fields:

- **Name** — required, max 100 chars
- **Webhook URL** — must be a valid URL
- **Scope** — RadioGroup: "All monitors" or "Specific monitors"
- **Monitor list** — scrollable checkbox list, shown only when scope is "Specific monitors"

On submit, calls `POST /api/integrations` (create) or `PATCH /api/integrations/[id]` (edit). Passes the result up via `onSaved(item)` — the parent updates its local list.

---

## Adding a new provider

This is the full, concrete checklist. No DB migration is required.

### 1. Add the type to `IntegrationConfig`

`src/lib/notifications/types.ts`:

```typescript
export type IntegrationConfig =
  | { type: "slack"; webhookUrl: string }
  | { type: "discord"; webhookUrl: string }; // ← add this
```

### 2. Create the provider adapter

`src/lib/notifications/discord.ts`:

```typescript
import type { NotificationContext } from "./types";

export async function sendDiscordNotification(
  config: { webhookUrl: string },
  ctx: NotificationContext,
): Promise<void> {
  // Discord webhooks accept a simple { content: "..." } body
  const res = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: buildDiscordMessage(ctx) }),
  });
  if (!res.ok) {
    throw new Error(`Discord webhook returned ${res.status}: ${await res.text()}`);
  }
}

function buildDiscordMessage(ctx: NotificationContext): string {
  // ...
}
```

### 3. Add the case to `dispatcher.ts`

```typescript
import { sendDiscordNotification } from "./discord";

export async function dispatch(config: IntegrationConfig, ctx: NotificationContext) {
  switch (config.type) {
    case "slack":
      return sendSlackNotification(config, ctx);
    case "discord":                                    // ← add this
      return sendDiscordNotification(config, ctx);
    default:
      assertNever(config.type); // compile error if you forgot a case
  }
}
```

If you skip step 3, the TypeScript compiler will error on the `assertNever` line because `config.type` is no longer narrowed to `never` in the `default` branch.

### 4. Update the API validation schema

`src/app/api/integrations/route.ts` — extend the `type` literal in the create schema:

```typescript
const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["slack", "discord"]),  // ← add "discord"
  webhookUrl: z.string().url(),
  monitorIds: z.array(z.string()).optional(),
});
```

### 5. Update `IntegrationDialog`

Add a type selector RadioGroup (or extend the existing one) so users can choose Discord. The hardcoded `type: "slack"` in the submit handler needs to read from the selected value.

### 6. Add a test helper

`src/lib/notifications/discord.ts` should export a `sendDiscordTestMessage(webhookUrl)` function. Update `src/app/api/integrations/[id]/test/route.ts` to dispatch to it:

```typescript
if (integration.type === "discord") {
  await sendDiscordTestMessage(config.webhookUrl);
}
```

---

## Failure handling

| Layer | Failure | Behavior |
|---|---|---|
| Slack HTTP error | `sendSlackNotification` throws | Caught by `fireIntegrations` catch block; logged with integration ID; other integrations still fire |
| All integrations fail | `Promise.allSettled` | All rejections logged; job continues |
| `fireIntegrations` itself throws | Outer IIFE catch | Logged as `[Worker] Notification dispatch error:`; `lastRunAt` update proceeds normally |
| Test endpoint | `sendSlackTestMessage` throws | Caught in route handler; returns `{ ok: false, error: message }` with HTTP 200 |

There is no retry mechanism in V1. Slack Incoming Webhooks have high availability; transient failures are expected to be rare and are surfaced via the Test Connection button.

---

## Testing

```bash
# Unit tests — payload builder, color logic, send helpers
pnpm test src/lib/__tests__/notifications.test.ts

# Deduplication unit tests — suppression rules, escalation, edge cases
pnpm test src/lib/notifications/__tests__/deduplication.test.ts

# API route tests — auth, validation, ownership, test endpoint
pnpm test src/app/api/integrations/__tests__/route.test.ts

# Component tests — empty state, add/edit dialog, test/delete/toggle
pnpm test src/components/__tests__/integrations-manager.test.tsx
```

**Test fixtures:**

`src/__tests__/helpers/fixtures.ts` exports `createIntegration()` for use in other tests that need a realistic `Integration` object.

**Mocking strategy:**

- Prisma is mocked via `src/__tests__/helpers/prisma-mock.ts` (vitest-mock-extended singleton).
- `global.fetch` is replaced with `vi.fn()` for webhook call assertions.
- Auth is mocked via `src/__tests__/helpers/auth-mock.ts`.

---

## Design decisions and trade-offs

### Incoming Webhooks vs. OAuth

**Decision:** Incoming Webhooks only, no OAuth flow.

**Rationale:** OAuth requires a registered Slack App with a publicly accessible callback URL — a significant setup burden for a side project. Incoming Webhooks require only pasting a URL. "Channel selection" happens on the Slack side during webhook creation.

**Trade-off:** Users must create and manage webhooks manually in the Slack UI. There is no per-channel management from inside PerfLab.

### `config Json` column

**Decision:** Store provider-specific config as untyped JSON rather than typed columns.

**Rationale:** New providers can be added without a schema migration. The shape is enforced in code (TypeScript union + Zod) at the API boundary.

**Trade-off:** The DB cannot enforce the shape. A migration error or manual DB edit could produce a config row that crashes the dispatcher. Mitigated by strict API validation on write.

### `MonitorIntegration` join table vs. nullable column

**Decision:** Separate join table with "zero rows = all monitors" convention.

**Rationale:** Avoids a nullable `targetMonitorId` column on `Integration` that would complicate queries. The "all monitors" case is the common default and has zero storage cost. The join table cleanly handles future "N monitors" cases without schema changes.

**Trade-off:** The convention (zero rows = all) is non-obvious and must be documented (here and in CLAUDE.md). Any future code that queries `MonitorIntegration` must understand this contract.

### Fire-and-forget vs. awaited

**Decision:** Notification dispatch runs as a void IIFE in the worker, not as an awaited call.

**Rationale:** A slow or broken webhook should never cause the BullMQ job to time out, fail, and retry — which would trigger another PSI fetch. The same pattern is used for `calculateBaselines`.

**Trade-off:** Notification failures are only visible in worker logs, not in the UI run timeline. The Test Connection button is the primary debugging surface.

### Deduplication via alert lifecycle

**Decision:** Use `RegressionAlert.status != "resolved"` as the deduplication gate rather than a time-window or a dedupliation table.

**Rationale:** The alert lifecycle (`open` → `acknowledged` → `resolved`) already models whether a user is aware of a regression. If an alert is `open` or `acknowledged`, the user already received (or will receive) a notification — re-notifying on every subsequent run adds noise without new signal. Only two events should re-arm notifications: severity escalation (the situation got worse) and resolution followed by recurrence (the metric was fixed and regressed again).

**Trade-off:** Deduplication is user-action-dependent. If a user never resolves alerts, they will only be notified once per metric regression (plus escalations). This is the correct product behavior — the alert list in the UI is the persistent record; Slack notifications are for "something new happened."

**Alternatives considered:**
- Time-window cooldown (e.g., suppress for 24h): requires storing last-notified timestamp; doesn't account for the alert having been acknowledged.
- Separate deduplication table: unnecessary complexity — the alert status is already the right signal.

### No retry in V1

**Decision:** Single attempt per audit, no retry queue.

**Rationale:** Slack Incoming Webhooks reliably return `2xx` or a clear error immediately. Transient network failures at audit time are acceptable. Adding a retry queue (BullMQ delayed jobs or a separate table) adds meaningful complexity.

**Future:** If reliability becomes a concern, add a `NotificationLog` table (integrationId, runId, status, attempts, lastError) and a retry worker.

---

**Last updated:** 2026-03-05
