# Alert Lifecycle

## Overview

Every `RegressionAlert` has a `status` field that tracks where it is in the triage workflow. Users can move alerts through statuses both from the alerts list and from the regression detail page.

## Statuses

| Status | Meaning |
|--------|---------|
| `open` | Newly detected — needs attention |
| `acknowledged` | Someone has seen it and is handling it |
| `resolved` | Root cause has been addressed |

## Valid Transitions

```
open ──► acknowledged ──► resolved
  │              │
  │              └──► open (Reopen)
  │
  └──► resolved (skip acknowledgement)
       │
       └──► open (Reopen)
```

Reopening is always allowed from `acknowledged` or `resolved` back to `open`. When reopening, all tracking timestamps (`acknowledgedAt`, `acknowledgedBy`, `resolvedAt`, `resolvedBy`) are cleared.

## API

### Update alert status

```
PATCH /api/regressions/:alertId
Content-Type: application/json

{
  "status": "acknowledged" | "resolved" | "open",
  "notes": "Optional note, e.g. Fixed in deploy abc123"  // optional
}
```

**Side effects by transition:**

- `→ acknowledged`: sets `acknowledgedAt` (now) and `acknowledgedBy` (user ID)
- `→ resolved`: sets `resolvedAt` (now) and `resolvedBy` (user ID)
- `→ open` (reopen): clears `acknowledgedAt`, `acknowledgedBy`, `resolvedAt`, `resolvedBy`

**Response:**

```json
{
  "alert": { ...updatedAlert }
}
```

Returns `400` for invalid `status` values, `404` if not found or not owned by the authenticated user.

### Filter alerts by status

```
GET /api/alerts?status=open
GET /api/alerts?status=acknowledged
GET /api/alerts?status=resolved
```

Omitting `status` returns all alerts regardless of status. All other query params (`days`, `severity`, `date`, `cursor`, `limit`) still apply.

## UI Interaction Points

### Alerts List (`/alerts`)

- **Status filter toggle** (All / Open / Acknowledged / Resolved) at the top of each time-period tab
- **Inline badge** on each alert card showing the current status
- **Actions dropdown** (compact) in the card header — available transitions based on current status
- Changing status triggers an optimistic update: the card badge updates immediately, no page reload

### Regression Detail Page (`/runs/:id/regressions/:alertId`)

- **Status badge** next to the metric name in the header
- **"Change Status" button** (full-size) — opens a dropdown with valid transitions
- Selecting a transition opens a popover where you can add an optional note before confirming
- **Metadata row** below the header shows `acknowledgedAt`, `resolvedAt` timestamps and any notes

### Summary Stats (`/alerts` header)

The stats row shows 30-day counts for all three statuses:
- Total Alerts
- Critical Alerts (severity filter)
- Open count
- Acknowledged count
- Resolved count
