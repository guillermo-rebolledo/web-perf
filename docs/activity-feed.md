# Activity Feed

## Overview

The Activity Feed provides a chronological log of events that occur across a user's workspace — site and monitor creation, audit completions, failures, regression detections, and deployment-triggered runs. It is accessible via `/activity` in the sidebar.

## Event Types

| Type | Entity | Emitted When |
|---|---|---|
| `site_created` | site | A new site is added via `POST /api/sites` |
| `monitor_created` | monitor | A new monitor is created via `POST /api/monitors` (both `schedule` and `deployment` trigger types) |
| `run_completed` | run | A PSI audit completes successfully in the worker |
| `run_failed` | run | A PSI audit fails in the worker (outer catch block) |
| `regression_detected` | run | One or more regression alerts are saved after a run |
| `deployment_run_triggered` | run | A GitHub `deployment_status` webhook fires and a run is enqueued |

## How Events Are Emitted

### API routes (`site_created`, `monitor_created`, `deployment_run_triggered`)

Events are recorded with `await recordActivity(...)` wrapped in a `try/catch` that logs the error and never affects the HTTP response.

### Worker (`run_completed`, `run_failed`, `regression_detected`)

Events are fire-and-forget IIFEs (`void (async () => { ... })()`), matching the existing pattern for notifications and AI generation. Errors are logged to `console.error("[activity] <type>:")` and never interrupt job completion or failure handling.

## API

`GET /api/activity` supports:

| Param | Default | Description |
|---|---|---|
| `limit` | 20 | Page size (clamped 1–100) |
| `cursor` | — | Opaque cursor from previous response |
| `type` | — | Filter by event type (e.g. `run_completed`) |

Response shape: `ActivityApiResponse` from `src/types/api.ts`.

## No Backfill

The `ActivityEvent` table is populated going forward from the time of deployment. There is no backfill for historical runs, sites, or monitors created before this feature was shipped.

## Retention Policy

Activity events are pruned nightly by the existing data-retention cron (runs at 04:00 UTC alongside run cleanup). Events older than **30 days** are deleted in batches of 500 to avoid long-running transactions.

- Default window: `DEFAULT_ACTIVITY_RETENTION_DAYS = 30` in `src/lib/retention.ts`
- Cleanup function: `cleanupOldActivityEvents()` in `src/lib/data-retention.ts`
- Scheduled in: `src/worker/scheduler.ts` (`scheduler-data-retention` cron)

The `@@index([userId, createdAt(sort: Desc)])` index makes the range-based delete efficient.

## Seeding Test Data

Use `seed:activity` to populate mock activity events for development:

```bash
# 50 events (default), spread across the last 30 days
pnpm seed:activity your-email@example.com

# Custom count (1–1000)
pnpm seed:activity your-email@example.com 100
```

Events are created with a weighted distribution across all 6 types (`run_completed` most frequent, `site_created` least) and realistic metadata. The email must match your logged-in account exactly.

See **[DATABASE_SCRIPTS.md](./DATABASE_SCRIPTS.md)** for full details.
