# Slack Integration

PerfLab can post a rich message to a Slack channel after every audit completes — including the performance score, all five Core Web Vitals, and a summary of any regressions detected.

Connection uses **Incoming Webhooks** (not OAuth). You create a webhook in Slack for a specific channel, paste the URL into PerfLab, and optionally restrict it to specific monitors. No Slack App registration or OAuth callback URL is needed.

---

## Setup (step by step)

### 1. Create a Slack Incoming Webhook

1. Go to **api.slack.com/apps** and click **Create New App → From scratch**.
2. Name it (e.g. "PerfLab") and select your workspace, then click **Create App**.
3. In the left sidebar, choose **Incoming Webhooks** and toggle **Activate Incoming Webhooks** to **On**.
4. Scroll down and click **Add New Webhook to Workspace**.
5. Select the channel you want to receive audit notifications (e.g. `#perf-alerts`) and click **Allow**.
6. Copy the **Webhook URL** — it looks like `https://hooks.slack.com/services/T.../B.../...`

> **Alternative (existing app):** If your workspace already has an app with Incoming Webhooks enabled, you can add a new webhook from the app's settings page without creating a new app.

### 2. Add the integration in PerfLab

1. Open **Settings → Notification Integrations**.
2. Click **Add Integration**.
3. Fill in the form:
   - **Name** — a label for your own reference, e.g. `Slack #perf-alerts`
   - **Webhook URL** — paste the URL from step 1
   - **Monitor scope** — choose:
     - *All monitors* — fires after every audit for every monitor you own
     - *Specific monitors* — check only the monitors you want covered
4. Click **Add Integration**.

### 3. Verify the connection

Click the **flask icon** (Test) on the integration row. PerfLab sends a verification message to your Slack channel immediately. If it doesn't arrive within a few seconds, check:

- The webhook URL was pasted correctly (it starts with `https://hooks.slack.com/services/`)
- The Slack app hasn't been removed from the workspace
- The channel still exists (archived channels stop accepting webhooks)

---

## What the Slack message looks like

Each message contains:

| Section | Content |
|---|---|
| **Header** | Score emoji + site name + "Audit Complete" |
| **Metrics grid** | Performance score, strategy (MOBILE/DESKTOP), LCP, CLS, INP, FCP, TTFB, completion timestamp |
| **Regressions** *(conditional)* | Bulleted list of regressed metrics with `+N%` and severity label — omitted when there are no regressions |
| **Action button** | "View Run →" deep-links to the run detail page in the app |
| **Attachment color** | Green (no regressions) / Orange (minor or moderate) / Red (any critical regression) |

The outer `text` field is used as a mobile push notification fallback (e.g. "My Site: Performance 82 — 2 regression(s) detected").

**Score emoji legend:**

| Score | Emoji |
|---|---|
| ≥ 90 | 🟢 |
| 50–89 | 🟡 |
| < 50 | 🔴 |
| null | ⚪ |

**Attachment color logic:**

| Regressions | Color |
|---|---|
| None | `#22c55e` (green) |
| Minor or moderate only | `#f97316` (orange) |
| Any critical | `#ef4444` (red) |

---

## Notification deduplication

PerfLab suppresses repeat Slack notifications for metrics that are already known to be regressed. This prevents Slack spam when the same metric (e.g. LCP) regresses across every monitoring run until it is fixed.

**Rules:**

| Situation | Slack notification |
|---|---|
| New regression (no prior open/acknowledged alert for this metric) | Sent |
| Same metric, same or lower severity — prior alert is open/acknowledged | Suppressed |
| Same metric, higher severity (escalation) — e.g. `moderate` → `critical` | Sent |
| Metric regression recurs after the alert was resolved | Sent |
| Run has no regressions (healthy audit) | Sent ("Audit Complete") |

**How to re-arm notifications for a metric:**

Resolve the alert from the alerts list in the app. Once the alert is resolved, the next run that detects a regression for that metric will send a fresh notification.

---

## Managing integrations

### Scope options

- **All monitors (default):** The integration fires for every completed audit across all your monitors. This is the default when you create an integration without selecting specific monitors. Technically: zero rows in the `MonitorIntegration` join table.
- **Specific monitors:** The integration fires only for the monitors you selected. Technically: one row per selected monitor in `MonitorIntegration`.

You can change the scope at any time by clicking the **Edit (pencil)** button on the integration row.

### Active toggle

The switch on each integration row enables or disables it without deleting it. Disabled integrations are silently skipped during dispatch.

### Editing

Click the pencil icon to open the edit form. You can change:

- The display name
- The webhook URL (if you rotated the webhook in Slack)
- The monitor scope

### Deleting

Click the trash icon to remove the integration permanently. All associated `MonitorIntegration` rows are cascade-deleted.

---

## Troubleshooting

### Test message sent, but not received

1. Check that the channel exists and hasn't been archived.
2. Check that the Slack app is still installed in the workspace (Workspace Settings → Apps).
3. Verify the webhook URL is correct — even one character difference will return a `400 invalid_payload` or `403 action_prohibited` from Slack.

### Audit completes but no Slack message arrives

1. Confirm the integration is **Active** (toggle is on).
2. Confirm the monitor scope matches the monitor that ran (or switch to "All monitors" to test).
3. Check the BullMQ worker logs for `[Worker] Notification dispatch error:` or `[Notifications] Failed to dispatch to integration`.
4. Use the **Test** button — if it succeeds, the webhook URL and channel are fine. If it fails, the error detail is shown inline.

### "invalid_payload" error from Slack

The webhook URL is valid but the JSON payload was rejected. This should not happen with the built-in payload builder. If you see this, file an issue with the run ID so the Block Kit payload can be inspected.

### Regression notification not received even though regressions were detected

1. The metrics may have been **suppressed by deduplication**: if the regressed metrics already have open or acknowledged alerts on this monitor, repeat notifications are intentionally suppressed. See [Notification deduplication](#notification-deduplication). To re-arm notifications, resolve the relevant alert(s) in the app.
2. Regression alerts are included only if they were created within the **last 60 seconds** before the notification fires. If the regression detection step is very slow (>60s), the window may not include the alerts. This is an edge case — the regression detection step normally takes under 1 second.

---

## No new environment variables required

`NEXTAUTH_URL` (already required) is used to build the "View Run →" deep-link. Webhook URLs are stored per-integration in the database. No global Slack token is needed.

---

## API reference (for CLI / programmatic use)

### List integrations

```http
GET /api/integrations
Authorization: Bearer <api-key>
```

Response (webhook URL is never returned):

```json
{
  "integrations": [
    {
      "id": "clxxx",
      "name": "Slack #perf-alerts",
      "type": "slack",
      "isActive": true,
      "monitorCount": 0,
      "createdAt": "2026-03-04T00:00:00.000Z"
    }
  ]
}
```

`monitorCount: 0` means "all monitors".

### Create integration

```http
POST /api/integrations
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "name": "Slack #perf-alerts",
  "type": "slack",
  "webhookUrl": "https://hooks.slack.com/services/...",
  "monitorIds": []
}
```

`monitorIds` is optional. Omit it or pass `[]` for "all monitors". Pass specific monitor IDs to restrict scope.

### Update integration

```http
PATCH /api/integrations/:id
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "name": "Slack #alerts",
  "isActive": false,
  "webhookUrl": "https://hooks.slack.com/services/new...",
  "monitorIds": ["mon-1", "mon-2"]
}
```

All fields are optional. `monitorIds` replaces the current scope — pass `[]` to revert to "all monitors".

### Delete integration

```http
DELETE /api/integrations/:id
Authorization: Bearer <api-key>
```

### Test connection

```http
POST /api/integrations/:id/test
Authorization: Bearer <api-key>
```

Always returns HTTP 200:

```json
{ "ok": true }
// or
{ "ok": false, "error": "Slack webhook returned 403: action_prohibited" }
```
