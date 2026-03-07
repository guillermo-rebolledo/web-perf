# Weekly Email Digest

## Overview

Every Monday at 9 AM UTC, PerfLabs sends a single-email performance summary to users who have opted in. The digest covers:

- Per-site performance score trends (this week vs last week)
- Core Web Vitals (LCP, CLS, INP) averages
- Open regression alerts by severity
- Top 3 regressions per site
- One-click unsubscribe (CAN-SPAM compliant)

Users with no successful runs in the past 7 days are silently skipped — no empty emails are sent.

---

## Architecture

```
[Scheduler: Mon 9 AM UTC cron]
  → enqueueDigestJob()                        src/lib/queue.ts
      → BullMQ queue: "weekly-digest"
          → processDigestJob()                src/worker/digest-processor.ts
              → aggregateUserDigest(userId)   src/lib/digest/aggregator.ts
              → sendDigestEmail(data)         src/lib/digest/sender.ts
                  → WeeklyDigestEmail()       src/emails/weekly-digest.tsx
                  → Resend API
```

### Key files

| File                                      | Purpose                                          |
| ----------------------------------------- | ------------------------------------------------ |
| `src/lib/queue.ts`                        | `DigestJobData` type + `enqueueDigestJob()`      |
| `src/worker/scheduler.ts`                 | Monday 9 AM cron that triggers the job           |
| `src/worker/digest-processor.ts`          | Job handler: fans out to all opted-in users      |
| `src/lib/digest/aggregator.ts`            | Queries DB, computes trends and alert counts     |
| `src/lib/digest/sender.ts`                | Renders template + sends via Resend              |
| `src/lib/digest/unsubscribe-token.ts`     | HMAC sign/verify for unsubscribe links           |
| `src/emails/weekly-digest.tsx`            | React Email template                             |
| `src/app/api/digest/unsubscribe/route.ts` | One-click unsubscribe endpoint                   |
| `src/app/api/user/route.ts`               | `PATCH /api/user` — toggle `weeklyDigestEnabled` |
| `src/components/digest-toggle.tsx`        | Settings page toggle                             |

---

## Environment Variables

Add to `.env`:

```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=digest@updates.perflabs.dev
```

Get a Resend API key at [resend.com/api-keys](https://resend.com/api-keys).

Unsubscribe links use `NEXTAUTH_URL` (already required by the app) as the base URL — no additional variable needed.

If `RESEND_API_KEY` is not set, the digest processor logs a skip — it will not crash the worker.

---

## Previewing the Email Template Locally

React Email ships a preview server:

```bash
pnpm email
# → opens http://localhost:3000 with live template preview
```

If the preview script is not yet in `package.json`, add it:

```json
"email": "email dev --dir src/emails"
```

The `WeeklyDigestEmail` component accepts a `data` prop (`UserDigestData`) and a fixture file can be dropped in `src/emails/` for preview.

---

## Triggering Manually (Development)

A dev-only endpoint runs the digest job immediately against all opted-in users in the DB:

```bash
curl -X POST http://localhost:3000/api/digest/trigger
```

Returns `{ ok: true }` on success. This endpoint returns 404 in production.

---

## Sending a Test Email

Use the `digest:test-email` script to send a real email through Resend without touching the scheduler or waiting for Monday. This is the fastest way to verify the template, formatting, and delivery during development.

### Prerequisites

1. **Resend account and API key** — sign up at [resend.com](https://resend.com) (free tier is sufficient for testing).

2. **A verified sender domain or address** in Resend. Until your domain is verified, Resend only allows sending to the email address used to create your Resend account. So for local testing, send to yourself.

3. **Environment variables** set in `.env`:

   ```
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=digest@updates.perflabs.dev   # must match a verified domain in Resend
   ```

   `NEXTAUTH_URL` (already set in `.env`) is used for unsubscribe links — no extra variable needed.

4. **Dependencies installed** (`pnpm install` — already done if you followed setup).

5. **Worker not required** — the script runs standalone, no `pnpm dev:worker` needed.

### Usage

```bash
# Send with fixture data (no DB required — works even with an empty database)
pnpm digest:test-email you@example.com

# Send with real DB data for the first opted-in user (requires running DB)
pnpm digest:test-email you@example.com --real

# Send with real DB data for a specific user by ID
pnpm digest:test-email you@example.com --user clxyz123abc
```

In all cases the email is delivered to `<email>` regardless of whose data is used — your inbox, not the actual user's.

### Modes

| Mode                 | DB required | Data source                                 | Best for                                |
| -------------------- | ----------- | ------------------------------------------- | --------------------------------------- |
| _(default)_          | No          | Rich fixture: 2 sites, mixed trends, alerts | Checking template layout and formatting |
| `--real`             | Yes         | First opted-in user's actual last 7 days    | Verifying real data renders correctly   |
| `--real --user <id>` | Yes         | Specific user's actual last 7 days          | Debugging a specific user's digest      |

### What the fixture data looks like

The fixture generates a realistic email with:

- **Marketing Site** — declining trend (score 81 → 68), 2 critical alerts, 3 regressions including an LCP +33% and CLS +100%
- **Docs** — improving trend (score 89 → 94), no alerts

This exercises the full template including alert badges, trend arrows, regression lists, and the CTA buttons.

### Troubleshooting

| Symptom                                  | Likely cause                                 | Fix                                                                                     |
| ---------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `RESEND_API_KEY is not set`              | Missing env var                              | Add `RESEND_API_KEY` to `.env`                                                          |
| Email delivered but from wrong address   | `RESEND_FROM_EMAIL` domain not verified      | Add/verify the domain in Resend dashboard, or use `onboarding@resend.dev` for testing   |
| `No users with weeklyDigestEnabled=true` | Using `--real` with empty/opted-out DB       | Run without `--real` to use fixture data instead, or enable digest for a user in the DB |
| `No digest data for this user`           | `--real` user has no runs in the past 7 days | Use a user with recent runs, or use fixture mode                                        |
| Email lands in spam                      | Sender domain not properly authenticated     | Set up SPF, DKIM, and DMARC for your sending domain in Resend                           |

---

## Unsubscribe Flow

1. Every digest email contains a signed unsubscribe link:
   `GET /api/digest/unsubscribe?token=<base64url>`

2. The token is `base64url(userId:hmac-sha256(userId:digest-unsubscribe))`, signed with `NEXTAUTH_SECRET`.

3. On click, the endpoint verifies the HMAC, sets `weeklyDigestEnabled = false`, then redirects to `/settings?unsubscribed=1`.

4. No session is required — the token is the credential.

Users can also re-enable the digest from `/settings`.

---

## Schema

One field was added to the `User` model:

```prisma
weeklyDigestEnabled Boolean @default(true)
```

New users are opted in by default (`@default(true)`). Existing users were opted in via the migration's `DEFAULT true`.

---

## Testing

Run all digest-related tests together:

```bash
pnpm test src/lib/digest src/worker/__tests__/digest-processor.test.ts src/app/api/digest src/app/api/user
```

Or the full suite:

```bash
pnpm test
```

### Test coverage by file

| Test file                                                | What it covers                                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/digest/aggregator.test.ts`                      | Empty users, no-runs-this-week skip, improving/declining trend detection, alert severity counting, top-3 regression ordering                                 |
| `src/lib/digest/unsubscribe-token.test.ts`               | Sign/verify round-trip, tampered token → null, malformed input → null, determinism                                                                           |
| `src/lib/digest/sender.test.ts`                          | Correct recipient and from address, subject format, `List-Unsubscribe` CAN-SPAM header, Resend error propagation                                             |
| `src/worker/__tests__/digest-processor.test.ts`          | Opted-in-only user filter, sends to all users with data, skips no-data users, **per-user error isolation** (one failure doesn't abort others), no-user no-op |
| `src/app/api/digest/unsubscribe/__tests__/route.test.ts` | Missing token → 400, invalid token → 400, DB field flip, redirect to `/settings?unsubscribed=1`                                                              |
| `src/app/api/user/__tests__/route.test.ts`               | Unauthenticated → 401, non-boolean body → 400, valid enable/disable → 200                                                                                    |

---

## Future Extension Points

- **Per-user cadence** — add `digestCadence` field to User (`"weekly"`, `"daily"`)
- **Per-monitor digest** — scope the email to a subset of monitors
- **Custom send day/time** — store in User preferences, update the cron to run more frequently and filter
- **Discord / Webhook channels** — reuse `UserDigestData` in a new dispatcher
- **Open tracking** — add a 1x1 pixel via Resend tracking

---

## Prisma Migration Drift — How to Avoid It

### What Causes Drift

Drift occurs when the database schema diverges from the local migration history. The most common cause on a shared dev database:

> **Someone runs `prisma migrate dev` (or `db push`) on a feature branch that adds new schema fields, against the shared local database. When they switch back to `main`, the DB has columns that `main`'s migration history doesn't know about.**

### Rules to Follow

1. **Never use `prisma db push` in any environment** — it mutates the DB without creating a migration file, making the history untrackable. Always use `prisma migrate dev --name <description>`.

2. **One database per developer** — each dev should run their own local Postgres (Docker Compose is already configured for this). Never share a dev DB across workstations or branches.

3. **When switching to a branch with schema changes**, decide upfront:
   - If the branch adds new columns (additive only), you can usually switch without resetting the DB.
   - If the branch removes or renames columns, run `pnpm prisma migrate reset` on your local DB first (data loss is fine in dev).

4. **If you detect drift** (`prisma migrate dev` warns about it), use `prisma migrate deploy` for additive-only migrations — it applies pending local migrations without the drift check:

   ```bash
   pnpm prisma migrate deploy
   ```

   Use this only for additive changes (ADD COLUMN, CREATE TABLE). For destructive changes, reset the DB.

5. **Never commit a manually-altered DB state** — if you ran SQL directly against the DB, create a matching migration file before committing, or your teammates' DBs will diverge.

6. **Check `_prisma_migrations` before merging** — if a branch's migration history doesn't line up with what's in the DB, resolve it before the PR merges into `main`.

### Quick Reference

| Situation                                        | Command                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Normal schema change on your branch              | `pnpm prisma migrate dev --name describe_change`                                                                               |
| Apply pending additive migrations (drift exists) | `pnpm prisma migrate deploy`                                                                                                   |
| Switching branches that remove/rename columns    | `pnpm prisma migrate reset` (local only)                                                                                       |
| Production deploy                                | `pnpm prisma migrate deploy`                                                                                                   |
| Inspect migration history                        | `docker exec -i <postgres> psql -U perflab -d perflab -c "SELECT migration_name FROM _prisma_migrations ORDER BY started_at;"` |
