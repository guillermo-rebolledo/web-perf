# Sentry Integration

This document describes the Sentry error monitoring and observability setup — intended for contributors who want to understand the implementation, debug issues, or extend the configuration.

---

## Overview

[Sentry](https://sentry.io) is integrated across the entire application to capture errors, performance traces, session replays, and cron job health. The integration covers:

- **Error Monitoring** — automatic capture of unhandled exceptions, promise rejections, server component errors, and API route failures across all three Next.js runtimes (browser, Node.js server, Edge)
- **Tracing** — server-side request tracing, client-side navigation spans, and Web Vitals collection
- **Session Replay** — video-like reproductions of user sessions when errors occur
- **Cron Monitoring** — tracks the worker's scheduled jobs (due monitor processing, weekly digest, screenshot cleanup) and alerts on missed or failed runs

The project uses Sentry's free tier which includes error monitoring, 10k performance spans/month, and 50 session replays/month.

---

## Architecture

Sentry runs in four separate contexts, each with its own initialization:

```
┌────────────────────────────────────────────────────────────┐
│                     Next.js Process                        │
│                                                            │
│  ┌─────────────────────┐  ┌──────────────────────────┐    │
│  │ Browser Runtime      │  │ Node.js Server Runtime   │    │
│  │ instrumentation-     │  │ sentry.server.config.ts  │    │
│  │ client.ts            │  │                          │    │
│  │                      │  │ • API routes             │    │
│  │ • Client errors      │  │ • Server Components      │    │
│  │ • Navigation spans   │  │ • Server Actions         │    │
│  │ • Session Replay     │  │ • onRequestError hook    │    │
│  │ • Web Vitals         │  │ • Local variables        │    │
│  └──────────┬───────────┘  └──────────┬───────────────┘    │
│             │                         │                     │
│  ┌──────────┴─────────────────────────┴───────────────┐    │
│  │ Edge Runtime (sentry.edge.config.ts)               │    │
│  │ • Middleware (if added later)                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Tunnel Route: /monitoring                          │    │
│  │ Proxies Sentry events through Next.js server       │    │
│  │ to bypass ad blockers                              │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    Worker Process                           │
│                                                            │
│  Sentry.init() via @sentry/node (standalone)               │
│                                                            │
│  • BullMQ job failures (audit + digest workers)            │
│  • processAuditJob errors (with runId/monitorId tags)      │
│  • Cron check-ins (node-cron instrumented)                 │
│  • Graceful flush on shutdown                              │
└────────────────────────────────────────────────────────────┘
```

---

## Configuration files

| File | Location | Runtime | Purpose |
|------|----------|---------|---------|
| `sentry.server.config.ts` | Project root | Node.js server | Server-side `Sentry.init` with `includeLocalVariables` |
| `sentry.edge.config.ts` | Project root | Edge | Edge runtime `Sentry.init` (middleware, edge routes) |
| `src/instrumentation-client.ts` | `src/` | Browser | Client-side `Sentry.init` with replay and tracing |
| `src/instrumentation.ts` | `src/` | Server/Edge | Loads the correct config per runtime; exports `onRequestError` |
| `next.config.ts` | Project root | Build time | `withSentryConfig` wrapper for source maps, tunnel route, CSP |
| `src/worker/index.ts` | `src/worker/` | Worker process | Standalone `@sentry/node` init for the BullMQ worker |

### Runtime dispatch

The `src/instrumentation.ts` file uses `NEXT_RUNTIME` to load the correct config:

| `NEXT_RUNTIME` value | Config loaded |
|----------------------|---------------|
| `"nodejs"` | `sentry.server.config.ts` |
| `"edge"` | `sentry.edge.config.ts` |
| _(client bundle)_ | `src/instrumentation-client.ts` (handled by Next.js automatically) |

The worker process is standalone — it initializes `@sentry/node` directly in `src/worker/index.ts`, not through the Next.js instrumentation hook.

---

## Environment variables

| Variable | Runtime | Required | Description |
|----------|---------|----------|-------------|
| `SENTRY_DSN` | Server, Worker | Optional | Server-side DSN for error reporting |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | Optional | Client-side DSN (public, embedded in browser bundle) |
| `SENTRY_AUTH_TOKEN` | Build (CI) | Optional | Auth token for source map uploads |
| `SENTRY_ORG` | Build | Optional | Sentry organization slug (used by `withSentryConfig`) |
| `SENTRY_PROJECT` | Build | Optional | Sentry project slug (used by `withSentryConfig`) |

Both DSN variables are optional — the application runs without Sentry in development if they are not set. The SDK silently no-ops when `dsn` is `undefined`.

### Setting up locally

1. Create a free Sentry account at [sentry.io](https://sentry.io)
2. Create a Next.js project in your Sentry organization
3. Copy the DSN from **Settings → Projects → [Your Project] → Client Keys (DSN)**
4. Add to your `.env`:

```env
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

Both DSN values are usually the same — the public DSN is safe to expose in client bundles.

---

## Error capture coverage

### Automatic (zero config)

| Error type | Captured? | Mechanism |
|------------|-----------|-----------|
| Unhandled client JS exceptions | Yes | `window.onerror` (GlobalHandlers integration) |
| Unhandled promise rejections (client) | Yes | `window.onunhandledrejection` |
| Server Component render errors | Yes | `onRequestError` hook in `instrumentation.ts` |
| Unhandled API route crashes | Yes | Node.js uncaught exception handler |
| Re-thrown errors from `try/catch` | Yes | Bubbles to global handler |

### Manual (`captureException` required)

| Error type | Where | Why |
|------------|-------|-----|
| `error.tsx` boundary errors | `src/app/error.tsx` | Next.js catches before Sentry sees them |
| `global-error.tsx` boundary errors | `src/app/global-error.tsx` | Same reason |
| Route-specific error boundaries | `src/app/(app)/alerts/error.tsx` | Same reason |
| Worker job failures | `src/worker/processor.ts` | Caught and re-thrown; Sentry tags added before re-throw |
| Worker event errors | `src/worker/index.ts` | BullMQ `failed`/`error` events |

**The core rule:** if you catch an error and don't re-throw it, Sentry never sees it. Add `Sentry.captureException(error)` before any graceful return.

---

## Session Replay

Session Replay is configured in `src/instrumentation-client.ts` (browser only).

### Sample rates

| Setting | Value | Behavior |
|---------|-------|----------|
| `replaysSessionSampleRate` | `0.1` | 10% of all sessions recorded from start |
| `replaysOnErrorSampleRate` | `1.0` | 100% of sessions captured when an error occurs |

When a session is not sampled upfront, the SDK keeps a ~60-second rolling buffer in memory. If an error occurs, the buffer plus all subsequent recording is uploaded.

### Privacy defaults

All masking happens client-side before data is sent to Sentry:

| Setting | Default | Effect |
|---------|---------|--------|
| `maskAllText` | `true` | Text replaced with `*` characters |
| `maskAllInputs` | `true` | Input values masked |
| `blockAllMedia` | `true` | Images, video, audio replaced with placeholders |

To mask specific elements, add `data-sentry-mask` or `class="sentry-mask"`. To block entirely, use `data-sentry-block`.

### CSP requirements

Session Replay uses a Web Worker for off-thread compression. The CSP in `next.config.ts` includes:

```
worker-src 'self' blob:
child-src 'self' blob:
```

---

## Tracing

### What is auto-instrumented

**Client (browser):**
- Page loads with Web Vitals (LCP, CLS, FCP, TTFB)
- Client-side navigations
- `fetch()` requests
- INP (Interaction to Next Paint)

**Server (Node.js):**
- API route handlers (`app/api/*/route.ts`)
- React Server Components render
- `onRequestError` captures server errors

**Edge:**
- Middleware (when added)
- Edge route handlers

### Sample rates

| Environment | `tracesSampleRate` |
|-------------|-------------------|
| Development | `1.0` (100%) |
| Production | `0.1` (10%) |

Configured identically across all three runtime configs. Adjust based on traffic volume — the free tier allows 10k spans/month.

### Navigation tracing

The client exports `onRouterTransitionStart = Sentry.captureRouterTransitionStart` in `instrumentation-client.ts`, which hooks into App Router navigation transitions.

---

## Cron monitoring

The worker's `node-cron` instance is instrumented via `Sentry.cron.instrumentNodeCron()` in `src/worker/scheduler.ts`. This automatically sends check-in events to Sentry.

### Monitored cron jobs

| Slug | Schedule | Purpose |
|------|----------|---------|
| `scheduler-process-due-monitors` | `*/1 * * * *` (every minute) | Finds and enqueues due monitors |
| `scheduler-weekly-digest` | `0 9 * * 1` (Monday 9 AM UTC) | Enqueues weekly digest email job |
| `scheduler-screenshot-cleanup` | `0 3 * * *` (daily 3 AM) | Cleans up expired screenshots |

### What Sentry detects

- **Missed** — the cron job didn't run at the expected time
- **Failed** — the job ran but threw an error
- **Timeout** — the job exceeded `maxRuntime` without completing

Cron monitors are auto-created in Sentry on the first check-in.

---

## Worker integration

The BullMQ worker is a standalone Node.js process that runs separately from the Next.js server. It uses `@sentry/node` (not `@sentry/nextjs`) because it has no Next.js runtime.

### Initialization

`Sentry.init()` is called at the top of `src/worker/index.ts`, immediately after `dotenv/config` loads environment variables. This ensures all subsequent code is instrumented.

### Error capture points

| Location | What's captured | Tags |
|----------|----------------|------|
| `worker.on("failed")` | Audit job failures | `worker`, `jobId` |
| `worker.on("error")` | Worker-level errors | `worker` |
| `digestWorker.on("failed")` | Digest job failures | `worker`, `jobId` |
| `processAuditJob` catch block | PSI fetch/parse errors | `runId`, `monitorId`, `siteUrl`, `strategy` |

### Graceful shutdown

The shutdown handler calls `Sentry.close(2000)` before `process.exit(0)` to ensure pending events are flushed to Sentry (with a 2-second timeout).

---

## Source maps

Source maps enable readable stack traces in production. Without them, error reports show minified code like `a.forEach(e=>e.b(t))` instead of the actual function and variable names.

### How it works

The `withSentryConfig` wrapper in `next.config.ts` hooks into `next build`. When `SENTRY_AUTH_TOKEN` is available, it automatically:

1. Generates source maps during the build
2. Uploads them to Sentry (associated with the release/commit)
3. Strips source maps from the production bundle (they are never served to users)

Sentry then uses the uploaded maps to de-minify stack traces when displaying errors.

### Step-by-step production setup

#### 1. Find your org and project slugs

Go to [sentry.io](https://sentry.io) and open your project. The URL will look like:

```
https://your-org.sentry.io/projects/your-project/
```

- **Org slug**: `your-org` (the subdomain)
- **Project slug**: `your-project` (the path segment after `/projects/`)

You can also find both under **Settings -> General Settings**.

#### 2. Generate an auth token

1. Go to [sentry.io/settings/auth-tokens/](https://sentry.io/settings/auth-tokens/)
2. Click **"Create New Token"**
3. Select the following scopes:
   - `project:releases`
   - `org:read`
4. Give it a name like `ci-source-maps`
5. Click **"Create Token"**
6. Copy the token (starts with `sntrys_eyJ...`) — it won't be shown again

#### 3. Add secrets to your CI/CD provider

Add these three environment variables as secrets in your deployment platform:

| Variable | Value | Example |
|----------|-------|---------|
| `SENTRY_AUTH_TOKEN` | The token from step 2 | `sntrys_eyJpYX...` |
| `SENTRY_ORG` | Your organization slug | `my-team` |
| `SENTRY_PROJECT` | Your project slug | `perflabs` |

**Where to set them by platform:**

- **Vercel**: Settings -> Environment Variables (set for Production only)
- **GitHub Actions**: Settings -> Secrets and variables -> Actions -> New repository secret
- **Railway**: Project -> Variables
- **Fly.io**: `fly secrets set SENTRY_AUTH_TOKEN=sntrys_... SENTRY_ORG=my-team SENTRY_PROJECT=perflabs`

#### 4. Verify the upload works

After deploying with the secrets set, check the build logs. You should see output like:

```
> Creating an optimized production build...
> Sentry: Uploading source maps...
> Sentry: Source maps uploaded successfully.
```

Then in Sentry, go to **Settings -> Source Maps** — you should see a new upload entry matching the build.

#### 5. Test with a real error

Trigger an error in production and check the Sentry issue. The stack trace should show:

- Actual file names (e.g. `src/worker/processor.ts`) instead of hashed chunks
- Real function names and line numbers
- Source code context around the error line

### Local source map testing (optional)

To test source map uploads locally without deploying:

1. Create `.env.sentry-build-plugin` in the project root (gitignored by the `.env*` pattern):

```env
SENTRY_AUTH_TOKEN=sntrys_eyJ...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

2. Run a production build:

```bash
pnpm build
```

3. Check the build output for "Sentry: Uploading source maps..."

---

## CSP policy

The Content-Security-Policy in `next.config.ts` includes:

| Directive | Added value | Reason |
|-----------|-------------|--------|
| `connect-src` | `https://*.ingest.sentry.io` | Fallback for direct Sentry event delivery (tunnel handles most traffic) |
| `worker-src` | `'self' blob:` | Session Replay compression Web Worker |
| `child-src` | `'self' blob:` | Safari compatibility for the compression worker |

---

## Tunnel route

The `/monitoring` route in `next.config.ts` (`tunnelRoute: "/monitoring"`) proxies Sentry events through the Next.js server. This prevents ad blockers from intercepting requests to `*.ingest.sentry.io`.

The tunnel route is created automatically by the `@sentry/nextjs` build plugin — no manual route file is needed. If a `middleware.ts` is added in the future, exclude `/monitoring` from the matcher:

```typescript
export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|---------|
| Events not appearing | DSN not set or misconfigured | Verify `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` in `.env`; temporarily add `debug: true` to `Sentry.init` |
| Stack traces show minified code | Source maps not uploading | Set `SENTRY_AUTH_TOKEN`; check build output for "Source Maps" |
| `onRequestError` not firing | SDK version too old | Requires `@sentry/nextjs` >= 8.28.0 |
| Errors from `error.tsx` missing | Next.js catches before Sentry | Verify `Sentry.captureException(error)` is in the `useEffect` |
| Session Replay not recording | CSP blocking blob workers | Verify `worker-src 'self' blob:` in CSP |
| Replay shows masked content | Privacy defaults are strict | Use `data-sentry-unmask` on safe elements, or adjust `maskAllText`/`blockAllMedia` |
| Tunnel route returns 404 | Build not run after config change | Run `next build` to generate the tunnel route |
| Cron check-ins missing | Worker not sending to Sentry | Verify `SENTRY_DSN` is set in the worker's environment |
| Worker errors not appearing | `@sentry/node` not initialized | Ensure `Sentry.init()` runs before any other worker code |
| Events blocked by ad blockers | Tunnel route not configured | Verify `tunnelRoute: "/monitoring"` in `next.config.ts` |

---

## Adding new features

The following can be enabled without structural changes:

### AI Monitoring

The app uses `@ai-sdk/openai` and `ai`. Sentry can monitor these calls:

```typescript
// In sentry.server.config.ts
import { sentryOpenAIIntegration } from "@sentry/node";

Sentry.init({
  // ...existing config
  integrations: [sentryOpenAIIntegration()],
});
```

### Profiling

Add `Document-Policy: js-profiling` header in `next.config.ts` and enable `nodeProfilingIntegration` in the server config.

### Logging

Enable structured logs:

```typescript
Sentry.init({
  // ...existing config
  enableLogs: true,
});

// Then use anywhere:
Sentry.logger.info("User created site", { siteId, url });
```

### Feedback widget

Uncomment in `src/instrumentation-client.ts`:

```typescript
integrations: [
  Sentry.replayIntegration(),
  Sentry.feedbackIntegration({ colorScheme: "system" }),
],
```
