# Railway Deployment Slack Notifications

This feature sends a Slack message to a dedicated channel whenever Railway deploys a new version of the app (success, failure, or crash).

It is completely separate from the per-user PSI audit notification system and is configured via environment variables.

---

## How it works

1. Railway POSTs a JSON payload to `/api/webhooks/railway` on every deployment event.
2. The endpoint verifies the `Authorization: Bearer <token>` header against `RAILWAY_WEBHOOK_SECRET` using timing-safe comparison.
3. Non-actionable statuses (`DEPLOYING`, `REMOVED`) are skipped — no Slack message is sent.
4. For `SUCCESS`, `FAILED`, or `CRASHED` statuses, a Block Kit message is built and POSTed to `RAILWAY_SLACK_WEBHOOK_URL`.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `RAILWAY_WEBHOOK_SECRET` | Yes (for feature to be active) | Shared secret set in the Railway dashboard; used to verify inbound webhook requests |
| `RAILWAY_SLACK_WEBHOOK_URL` | Yes (for feature to be active) | Slack incoming webhook URL for the deployment channel |

If either variable is missing, the endpoint returns `200 OK` immediately and no notification is sent (opt-in behavior).

---

## Setup

### 1. Create a Slack incoming webhook

1. Go to your Slack workspace → **Apps** → search for **Incoming Webhooks**.
2. Click **Add to Slack**, select the target channel (e.g. `#deployments`), and click **Allow**.
3. Copy the webhook URL (format: `https://hooks.slack.com/services/...`).

### 2. Set environment variables in Railway

In the Railway dashboard, add the following variables to your service:

```
RAILWAY_WEBHOOK_SECRET=<a strong random string you choose>
RAILWAY_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 3. Configure the Railway webhook

1. In the Railway dashboard, go to **Project Settings** → **Webhooks**.
2. Click **Add Webhook**.
3. Set the URL to: `https://your-app.railway.app/api/webhooks/railway`
4. Set the **Secret Token** to the same value as `RAILWAY_WEBHOOK_SECRET`.
5. Select **Deployment** events.
6. Save.

---

## Testing locally

Set the env vars in your `.env` file:

```
RAILWAY_WEBHOOK_SECRET=test-secret
RAILWAY_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Then run the dev server and use `curl` to test:

**Successful deployment:**
```bash
curl -X POST http://localhost:3000/api/webhooks/railway \
  -H "Authorization: Bearer test-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESS",
    "service": {"id": "s1", "name": "web"},
    "environment": {"id": "e1", "name": "production"},
    "deployment": {"id": "d1", "url": "https://example.railway.app"},
    "project": {"id": "p1", "name": "side"},
    "timestamp": "2026-03-06T12:00:00Z",
    "actor": {"id": "u1", "name": "Guillermo"}
  }'
```

**Failed deployment:**
```bash
curl -X POST http://localhost:3000/api/webhooks/railway \
  -H "Authorization: Bearer test-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "FAILED",
    "service": {"id": "s1", "name": "web"},
    "environment": {"id": "e1", "name": "production"},
    "deployment": {"id": "d1"},
    "project": {"id": "p1", "name": "side"},
    "timestamp": "2026-03-06T12:00:00Z"
  }'
```

**Non-actionable (should return 200 with `skipped: true`, no Slack message):**
```bash
curl -X POST http://localhost:3000/api/webhooks/railway \
  -H "Authorization: Bearer test-secret" \
  -H "Content-Type: application/json" \
  -d '{"status": "DEPLOYING", "service": {"id":"s1","name":"web"}, "environment": {"id":"e1","name":"production"}, "deployment": {"id":"d1"}, "project": {"id":"p1","name":"side"}, "timestamp": "2026-03-06T12:00:00Z"}'
```

**Wrong secret (should return 401):**
```bash
curl -X POST http://localhost:3000/api/webhooks/railway \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{"status":"SUCCESS",...}'
```

---

## Slack message format

**Success (green bar):**
- Header: `✅ Deployment succeeded`
- Fields: Project, Service, Environment, Triggered by, Deployment ID, Timestamp, URL (if present)

**Failure/Crash (red bar):**
- Header: `❌ Deployment failed` or `❌ Deployment crashed`
- Same fields as above
