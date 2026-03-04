# GitHub Webhook Integration — Developer Setup Guide

This guide explains how to test and develop the GitHub deployment webhook locally.

---

## How It Works

Monitors have a first-class `triggerType` field:
- `"schedule"` — runs on a cron cadence (standard behavior)
- `"deployment"` — fires only when GitHub sends a successful `deployment_status` event

When a deployment succeeds on GitHub (via Vercel, Netlify, Render, or a GitHub Actions workflow), GitHub sends a `deployment_status` webhook event to your registered URL. The webhook receiver:

1. Verifies the `X-Hub-Signature-256` header using HMAC-SHA256 against the monitor's stored secret
2. Ignores events that are not `deployment_status` with `state: "success"` and `environment: "production"`
3. Returns 404 if the monitor does not have `triggerType === "deployment"`
4. Creates a `Run` record and enqueues a PSI audit job via BullMQ

---

## Schema Fields

> **Migration note:** These columns were introduced via `prisma migrate dev`. If you're adding new fields to the `Monitor` model, always use `pnpm prisma migrate dev --name <name>` — never `prisma db push`. The `db push` command skips migration file creation, which causes prod to fall out of sync.

The following fields are on the `Monitor` model:

| Field | Type | Description |
|---|---|---|
| `triggerType` | `String` | `"schedule"` or `"deployment"` — immutable after creation |
| `githubRepo` | `String?` | `owner/repo` label for display only — not used in routing |
| `githubBranch` | `String?` | Branch label for display only — not used in routing |
| `githubWebhookSecret` | `String?` | Plaintext HMAC-SHA256 secret — auto-generated at creation, stored raw because verification requires the raw value |

---

## Creating a Deployment Monitor

When creating a monitor via `POST /api/monitors` with `triggerType: "deployment"`:

- A 32-byte hex webhook secret is auto-generated and stored
- The secret is returned **once** in the response as `webhookSecret` — it cannot be retrieved again
- `nextRunAt` is set to `2999-12-31` so the scheduler never picks this monitor up
- No initial Run is created (unlike schedule monitors which run immediately)

The MonitorForm UI shows a "Setup" view after creation with the webhook URL and secret displayed for copy.

---

## Local Development with smee.io

[smee.io](https://smee.io) proxies public webhook deliveries to your local dev server.

1. Go to https://smee.io and create a new channel. Copy the URL (e.g. `https://smee.io/abc123`).

2. Install the smee client:
   ```bash
   pnpm add -g smee-client
   ```

3. Forward events to your local server:
   ```bash
   smee --url https://smee.io/abc123 --target http://localhost:3000/api/webhooks/github/<monitorId>
   ```

4. In your GitHub repo, add a webhook pointing to your smee.io URL.

---

## Manual Testing with curl

You can simulate a valid `deployment_status` payload without GitHub.

### 1. Create a deployment monitor and capture the secret

When you create a deployment monitor via the UI or API, the `webhookSecret` is returned in the creation response. Save it — it's only shown once.

Alternatively, rotate the secret via the settings panel or API:

```bash
curl -X POST http://localhost:3000/api/monitors/<monitorId>/webhook-secret \
  -H "Authorization: Bearer <your-api-key>"
```

Copy the returned `secret`.

### 2. Build a test payload

```json
{
  "deployment_status": {
    "state": "success",
    "environment": "production"
  }
}
```

Save as `payload.json`.

### 3. Compute the HMAC-SHA256 signature

```bash
SECRET="<your-secret>"
PAYLOAD=$(cat payload.json)
SIG="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/.*= //')"
echo $SIG
```

### 4. Send the request

```bash
curl -X POST http://localhost:3000/api/webhooks/github/<monitorId> \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: deployment_status" \
  -H "X-Hub-Signature-256: $SIG" \
  -d @payload.json
```

Expected response: `202 Accepted` with `{ "runId": "...", "jobId": "..." }`.

---

## Secret Rotation

Rotating the secret generates a new 32-byte hex value and overwrites the existing one in the database. The raw secret is returned **once** — it cannot be retrieved again.

After rotation, you must immediately update the secret in GitHub Webhooks settings, otherwise subsequent webhooks will fail signature verification (401).

---

## Supported Platforms

| Platform | Notes |
|---|---|
| **Vercel** | Emits `deployment_status` automatically for all deployments |
| **Netlify** | Enable "Deploy notifications" → GitHub deployment status in site settings |
| **Render** | Emits `deployment_status` natively for web services |
| **GitHub Actions** | Use `actions/github-script` or `chrnorm/deployment-status` action to emit the event |

> **Important:** Only events with `environment: "production"` (case-insensitive) trigger an audit. Preview/staging deployments are ignored.

---

## Webhook Security

- Signatures are verified using `timingSafeEqual` from Node's `crypto` module — prevents timing side-channel attacks.
- The secret is stored plaintext in the DB because HMAC-SHA256 verification requires the raw value. Future improvement: encrypt at rest with a server-side KMS key.
- No rate limiting is applied at the webhook endpoint itself. Abuse is mitigated by the idempotency check (a monitor cannot have two concurrent runs).
