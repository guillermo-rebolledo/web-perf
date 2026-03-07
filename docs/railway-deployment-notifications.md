# Railway Deployment Slack Notifications

This feature sends a Slack message to a dedicated channel whenever Railway deploys a new version of the app (success, failure, or crash).

It is completely separate from the per-user PSI audit notification system and is configured via environment variables.

---

## How it works

1. Railway POSTs a JSON payload to `/api/webhooks/railway` on every deployment event.
2. Non-actionable statuses (`DEPLOYING`, `REMOVED`) are skipped — no Slack message is sent.
3. For `SUCCESS`, `FAILED`, or `CRASHED` statuses, a Block Kit message is built and POSTed to `RAILWAY_SLACK_WEBHOOK_URL`.

> **Note:** Railway's webhook dashboard does not support custom secret tokens, so the endpoint relies on the URL itself being non-guessable. The worst an unauthorized caller can do is trigger a fake Slack message — no DB writes or user data are involved.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `RAILWAY_SLACK_WEBHOOK_URL` | Yes (for feature to be active) | Slack incoming webhook URL for the deployment channel |

If the variable is missing, the endpoint returns `200 OK` immediately and no notification is sent (opt-in behavior).

---

## Setup

### 1. Create a Slack incoming webhook

1. Go to your Slack workspace → **Apps** → search for **Incoming Webhooks**.
2. Click **Add to Slack**, select the target channel (e.g. `#deployments`), and click **Allow**.
3. Copy the webhook URL (format: `https://hooks.slack.com/services/...`).

### 2. Set the environment variable in Railway

In the Railway dashboard, add the following variable to your service:

```
RAILWAY_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 3. Configure the Railway webhook

1. In the Railway dashboard, go to **Project Settings** → **Webhooks**.
2. Click **Add Webhook**.
3. Set the URL to: `https://your-app.railway.app/api/webhooks/railway`
4. Select **Deployment** events.
5. Save.

---

## Testing locally

Set the env var in your `.env` file:

```
RAILWAY_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Then run the dev server and use `curl` to test:

**Successful deployment:**
```bash
curl -X POST http://localhost:3000/api/webhooks/railway \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Deployment.deployed",
    "timestamp": "2026-03-06T12:00:00Z",
    "details": {
      "id": "d1",
      "status": "SUCCESS",
      "commitAuthor": "Guillermo",
      "commitMessage": "feat: my change",
      "commitHash": "abc1234def5678"
    },
    "resource": {
      "project": {"id": "p1", "name": "perflabs"},
      "service": {"id": "s1", "name": "web"},
      "environment": {"id": "e1", "name": "production"},
      "deployment": {"id": "d1"}
    }
  }'
```

**Failed deployment:**
```bash
curl -X POST http://localhost:3000/api/webhooks/railway \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Deployment.failed",
    "timestamp": "2026-03-06T12:00:00Z",
    "details": {"id": "d1", "status": "FAILED", "commitAuthor": "Guillermo"},
    "resource": {
      "project": {"id": "p1", "name": "perflabs"},
      "service": {"id": "s1", "name": "web"},
      "environment": {"id": "e1", "name": "production"},
      "deployment": {"id": "d1"}
    }
  }'
```

**Non-actionable (should return 200 with `skipped: true`, no Slack message):**
```bash
curl -X POST http://localhost:3000/api/webhooks/railway \
  -H "Content-Type: application/json" \
  -d '{"type":"Deployment.deploying","timestamp":"2026-03-06T12:00:00Z","details":{"id":"d1","status":"DEPLOYING"},"resource":{"project":{"id":"p1","name":"perflabs"},"service":{"id":"s1","name":"web"},"environment":{"id":"e1","name":"production"},"deployment":{"id":"d1"}}}'
```

---

## Slack message format

**Success (green bar):**
- Header: `✅ Deployment succeeded`
- Fields: Project, Service, Environment, Triggered by, Deployment ID, Timestamp, Commit (hash + first line of message)

**Failure/Crash (red bar):**
- Header: `❌ Deployment failed` or `❌ Deployment crashed`
- Same fields as above
