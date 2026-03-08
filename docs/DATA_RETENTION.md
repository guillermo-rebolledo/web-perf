# Data Retention Policy

This document describes how PerfLabs stores and automatically deletes audit data to keep the database from growing unbounded.

---

## What is retained and for how long

| Data type | Retention window | Deletion trigger |
|-----------|-----------------|-----------------|
| **Run** (PSI audit result + scores + metadata) | `RUN_RETENTION_DAYS` (default: **90 days**) | Daily at 04:00 UTC |
| **Audit** rows (per-audit Lighthouse details) | Same as parent Run (cascade) | — |
| **Insight** rows (opportunity details) | Same as parent Run (cascade) | — |
| **RegressionAlert** rows | Same as parent Run (cascade) | — |
| **Screenshot data** (base64 in `screenshotData`) | `SCREENSHOT_TTL_DAYS` (default: **30 days**) | Daily at 03:00 UTC |
| **RegressionBaseline** rows | Forever (one row per metric per monitor) | Manual |
| **Site / Monitor / User** rows | Forever | Manual deletion |

### Cascade behaviour

`Audit`, `Insight`, and `RegressionAlert` all have `onDelete: Cascade` on their foreign key to `Run`. Deleting a `Run` row automatically removes all child rows — no separate cleanup step is needed.

### Which runs are deleted

Only runs with a `completedAt` timestamp are eligible for deletion. Runs in `queued` or `running` state (where `completedAt` is `null`) are never touched by the retention job; those are handled separately by the orphan-recovery mechanism in the worker.

---

## Configuration

Set either variable in your `.env` file:

```env
# How many days of run history to keep (default: 90)
RUN_RETENTION_DAYS=90

# How many days to keep screenshot data before nulling it out (default: 30)
SCREENSHOT_TTL_DAYS=30
```

Both variables are validated at startup via `src/env.js`. If not set, the defaults above apply.

---

## How the cleanup runs

The BullMQ worker scheduler (`src/worker/scheduler.ts`) registers two nightly cron jobs:

| Time (UTC) | Job | Function |
|-----------|-----|---------|
| 03:00 | Screenshot cleanup | `cleanupOldScreenshots(SCREENSHOT_TTL_DAYS)` |
| 04:00 | Run retention | `cleanupOldRuns(RUN_RETENTION_DAYS)` |

The retention job is implemented in `src/lib/data-retention.ts`. It deletes in batches of 500 rows to avoid long-running transactions and excessive DB lock pressure.

---

## Where the policy is shown in the UI

Users see the retention window surfaced in three places:

1. **Create Monitor dialog** — a note at the bottom of both the Schedule and Deployment forms reads _"Run history and alerts are retained for N days."_
2. **Run History page** (`/history`) — the page subtitle includes _"runs are kept for N days."_
3. **Regression Alerts page** (`/alerts`) — the page subtitle includes _"alerts are kept for N days."_

In all cases the number reflects the live value of `RUN_RETENTION_DAYS` (read at server render time), so it updates automatically if the environment variable is changed.

---

## Operational notes

- **No migration needed.** Retention is implemented purely at the application layer — no schema changes required.
- **Idempotent.** Re-running the cleanup job for the same cutoff date is safe; it simply finds zero eligible rows and exits.
- **Monitoring.** The scheduler logs each batch deletion and a final summary count. Watch for `[Retention]` log lines in production to confirm the job is running.
- **Manual cleanup.** To reclaim space immediately (e.g. before a launch), you can invoke the function directly from a REPL or one-off script:

```typescript
import { cleanupOldRuns } from "@/lib/data-retention";
const stats = await cleanupOldRuns(90);
console.log(stats); // { runsDeleted: N }
```
