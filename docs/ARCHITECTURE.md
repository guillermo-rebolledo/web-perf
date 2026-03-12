# Web Performance Lab - Architecture Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Background Jobs & Workers](#background-jobs--workers)
8. [Authentication & API Keys](#authentication--api-keys)
9. [Regression Detection System](#regression-detection-system)
10. [GitHub Webhook Integration](#github-webhook-integration)
11. [Notification Integrations](#notification-integrations)
12. [AI Features](#ai-features)
13. [CLI](#cli)
14. [Alerts System](#alerts-system)
15. [Weekly Digest](#weekly-digest)
16. [Feature Flags](#feature-flags)
17. [Key Data Flows](#key-data-flows)
18. [Development Workflow](#development-workflow)
19. [File Structure](#file-structure)

---

## Project Overview

Web Performance Lab (PerfLabs) is a production-ready SaaS for monitoring website performance using Google's PageSpeed Insights API. It allows users to:

- Create and manage multiple sites
- Configure monitors for both mobile and desktop
- Schedule automated or deployment-triggered performance audits
- Trigger on-demand performance runs
- View historical performance trends
- Compare performance metrics between runs
- Track Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
- Detect and investigate performance regressions with AI-powered root cause analysis
- Receive Slack notifications and weekly email digests
- Manage API keys for programmatic access via a CLI

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui (Radix UI primitives)
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Database**: PostgreSQL 16
- **ORM**: Prisma 6
- **Queue**: BullMQ (Redis-backed)
- **Cache/Rate Limiting**: Redis (ioredis)
- **Scheduler**: node-cron
- **Authentication**: NextAuth.js v5 (Auth.js) + API key auth

### AI
- **Provider**: OpenAI (gpt-4o-mini)
- **SDK**: Vercel AI SDK (`ai` package) for streaming
- **Features**: Run summaries, fix-it suggestions, pattern insights, health reports
- **Feature Flags**: PostHog

### Infrastructure
- **Containerization**: Docker Compose (PostgreSQL, Redis)
- **Email**: Nodemailer (magic links + weekly digest)
- **External API**: Google PageSpeed Insights API

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Next.js App                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Frontend (React Server Components + Client)                          │  │
│  │  • Pages (/dashboard, /sites/[id], /runs/[id], /alerts, /history)    │  │
│  │  • Components (Forms, Charts, Tables, AI Summary, Regression Alerts) │  │
│  │  • Authentication (NextAuth.js)                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Backend (API Routes)                                                 │  │
│  │  • /api/sites, /api/monitors, /api/runs, /api/alerts                 │  │
│  │  • /api/regressions/[alertId], /api/keys                             │  │
│  │  • /api/integrations, /api/monitors/[id]/pattern-insights            │  │
│  │  • /api/runs/[id]/ai-summary, /api/regressions/[id]/code-suggestions │  │
│  │  • /api/webhooks/github/[monitorId] (HMAC auth only)                 │  │
│  │  • /api/auth/[...nextauth], /api/cli/login                           │  │
│  │  • /api/digest/*, /api/user/export, /api/quota, /api/health          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
          ┌───────────────────────────────────┐
          │         PostgreSQL Database        │
          │  • Users, Sites, Monitors, Runs   │
          │  • Audits, ApiKeys                │
          │  • RegressionBaseline/Alert       │
          │  • Integration, MonitorIntegration│
          │  • MonitorInsight                 │
          │  • NextAuth Sessions              │
          └───────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Worker Process                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  BullMQ Worker                                                        │  │
│  │  • Consumes audit jobs + digest jobs                                  │  │
│  │  • Calls PageSpeed Insights API                                       │  │
│  │  • Parses/stores results, detects regressions                        │  │
│  │  • Fires notification integrations (Slack)                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Scheduler (node-cron)                                                │  │
│  │  • Every minute: checks for due monitors, enqueues audit jobs        │  │
│  │  • Monday 9 AM: enqueues weekly digest job                           │  │
│  │  • Daily 3 AM: cleans up old screenshots                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │      Redis       │
                    │  • Job Queue     │
                    │  • Rate Limits   │
                    │  • AI Gen Locks  │
                    └──────────────────┘
         ┌────────────────┘ └─────────────────┐
         ↓                                     ↓
┌──────────────────────┐           ┌─────────────────────┐
│  PageSpeed Insights  │           │   OpenAI API        │
│  External API        │           │  gpt-4o-mini        │
└──────────────────────┘           └─────────────────────┘
```

---

## Frontend Architecture

### Directory Structure

```
src/app/
├── layout.tsx              # Root layout with auth + theme providers
├── page.tsx                # Home (redirects to dashboard)
├── globals.css             # Global styles and Tailwind config
├── sitemap.ts              # Dynamic sitemap (SEO)
├── robots.ts               # robots.txt (SEO)
├── dashboard/page.tsx      # Sites list and overview
├── sites/[id]/page.tsx     # Site detail with monitors and chart
├── runs/[id]/
│   ├── page.tsx            # Run details with metrics + AI summary
│   └── compare/[id2]/page.tsx  # Compare two runs side-by-side
├── alerts/page.tsx         # Regression alerts with filters
├── history/page.tsx        # Cross-site run history
├── settings/page.tsx       # API key management + weekly digest toggle
└── auth/
    ├── signin/page.tsx
    ├── verify-request/page.tsx
    └── error/page.tsx
```

### Key Patterns

#### 1. Server Components (Default)
All pages are React Server Components by default, enabling direct database access and server-side auth.

#### 2. Client Components (Selective)
Marked `"use client"` only for forms, charts, or components using React hooks.

#### 3. Type Safety with Prisma
All database types are inferred from Prisma schema via `Prisma.*GetPayload<{...}>`.

### Component Architecture

#### Reusable UI Components (`src/components/ui/`)
Built with shadcn/ui (Radix UI + Tailwind). Fully accessible, composable.

#### Feature Components (`src/components/`)
- **Forms**: `SiteForm`, `MonitorForm` (two-step: trigger type → fields → deployment setup)
- **Visualizations**: `MetricsChart` — Recharts performance trends
- **Actions**: `RunButton` — on-demand runs with rate limiting
- **Display**: `ScoreBadge`, `MetricBadge` — color-coded performance indicators
- **Regression**: `AlertsList`, `RegressionAlertCard`, `FixItSuggestionsPanel`
- **AI**: `AiSummaryPanel`, `PatternInsightsPanel`, `HealthReportPanel`
- **Integrations**: `IntegrationsManager`, `IntegrationDialog`
- **GitHub**: `GithubIntegrationPanel` (deployment monitors only)
- **CLI**: `ApiKeyManager` in settings page
- **Navigation**: `AppSidebar`, `SessionProvider` — auth-aware UI

### State Management

No external state library — leveraging Next.js patterns:
1. **Server State**: Fetched in Server Components, passed as props
2. **URL State**: Search params for filters, pagination, cursor
3. **Local State**: `useState` for UI-only state (modals, forms)
4. **Form State**: React Hook Form for complex form management

---

## Backend Architecture

### API Routes Structure

```
src/app/api/
├── auth/[...nextauth]/route.ts     # NextAuth handlers
├── sites/
│   ├── route.ts                    # GET (list), POST (create)
│   ├── [id]/route.ts               # GET, PUT, DELETE
│   └── search/route.ts             # GET (search by name/URL)
├── monitors/
│   ├── route.ts                    # GET, POST
│   └── [id]/
│       ├── route.ts                # PUT, DELETE
│       ├── run/route.ts            # POST (trigger manual run)
│       ├── webhook-secret/route.ts # POST (rotate secret; user auth required)
│       └── pattern-insights/route.ts # GET (AI pattern insights)
├── runs/
│   ├── route.ts                    # GET (with pagination)
│   └── [id]/
│       ├── route.ts                # GET (details)
│       ├── compare/[id2]/route.ts  # GET (comparison)
│       ├── ai-summary/route.ts     # POST (AI run summary; streaming)
│       └── regressions/route.ts   # GET (regressions for a run)
├── alerts/
│   ├── route.ts                    # GET (cursor pagination + filters)
│   └── dates/route.ts             # GET (dates with alerts)
├── regressions/
│   └── [alertId]/
│       ├── route.ts                # GET (alert details) + PATCH (status update)
│       └── code-suggestions/route.ts # POST (AI fix-it; streaming)
├── integrations/
│   ├── route.ts                    # GET, POST
│   └── [id]/
│       ├── route.ts                # PATCH, DELETE
│       └── test/route.ts          # POST (always HTTP 200)
├── keys/
│   ├── route.ts                    # GET, POST (create API key; session only)
│   └── [id]/route.ts              # DELETE (revoke)
├── digest/
│   ├── trigger/route.ts           # POST (dev-only manual trigger)
│   └── unsubscribe/route.ts       # POST (unsubscribe from digest)
├── user/
│   ├── export/route.ts            # GET (GDPR data export)
│   └── confirm-delete/route.ts    # POST (account deletion)
├── quota/route.ts                  # GET (user quota/limits)
├── health/route.ts                 # GET (health check)
├── cli/login/route.ts             # GET (CLI login flow)
├── webhooks/
│   ├── github/[monitorId]/route.ts # POST (GitHub deployment events; HMAC auth only)
│   └── railway/route.ts           # POST (Railway deployment notifications)
└── scheduler/
    └── tick/route.ts              # POST (internal scheduler trigger; x-scheduler-secret)
```

### API Patterns

#### 1. Authentication Middleware
All routes check authentication via `resolveUser(request)` (`src/lib/resolve-user.ts`), which accepts either a Bearer API key or a NextAuth session cookie.

Webhook routes (`/api/webhooks/github/[monitorId]`) are the sole exception: they use HMAC-SHA256 signature verification only (`x-hub-signature-256` header), with no user session.

#### 2. Authorization
All resources are scoped to the authenticated user by filtering with `userId`.

#### 3. Input Validation
All inputs are validated with Zod before use.

#### 4. Rate Limiting
Redis-based rate limiting (`src/lib/rate-limit.ts`) is applied to:
- Manual runs (5 per minute per user)
- AI features (5 per day per user)
- API key creation (10 per hour per user)
- Integration test endpoint

---

## Database Schema

### Core Models

#### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  weeklyDigestEnabled Boolean @default(false)
  sites         Site[]
  accounts      Account[]
  sessions      Session[]
  apiKeys       ApiKey[]
}
```

#### Site
```prisma
model Site {
  id       String    @id @default(cuid())
  name     String
  url      String
  userId   String
  user     User      @relation(...)
  monitors Monitor[]
}
```

#### Monitor
```prisma
model Monitor {
  id                  String    @id @default(cuid())
  siteId              String
  cadenceMinutes      Int       @default(1440)
  strategy            String    @default("mobile")  // "mobile" | "desktop"
  isActive            Boolean   @default(true)
  nextRunAt           DateTime  @default(now())
  lastRunAt           DateTime?
  // Trigger type (immutable after creation)
  triggerType         String    @default("schedule") // "schedule" | "deployment"
  // GitHub Webhook (deployment monitors only)
  githubRepo          String?
  githubBranch        String?   @default("main")
  githubWebhookSecret String?
  site                Site      @relation(...)
  runs                Run[]
  integrations        MonitorIntegration[]
  insights            MonitorInsight[]
}
```

> **Note:** Deployment monitors have `nextRunAt = 2999-12-31` so the scheduler never picks them up. `triggerType` is chosen at creation and is immutable.

#### Run
```prisma
model Run {
  id          String    @id @default(cuid())
  monitorId   String
  status      String    @default("queued") // "queued" | "running" | "success" | "failed"
  jobId       String?   @unique
  queuedAt    DateTime  @default(now())
  startedAt   DateTime?
  completedAt DateTime?

  // Performance Scores (0-100)
  performanceScore   Float?
  accessibilityScore Float?
  bestPracticesScore Float?
  seoScore           Float?

  // Core Web Vitals
  lcp  Float?  // Largest Contentful Paint (ms)
  inp  Float?  // Interaction to Next Paint (ms)
  tbt  Float?  // Total Blocking Time (ms)
  cls  Float?  // Cumulative Layout Shift
  fcp  Float?  // First Contentful Paint (ms)
  ttfb Float?  // Time to First Byte (ms)

  // Environment Metadata
  browserUserAgent      String?
  benchmarkIndex        Float?
  emulatedFormFactor    String?
  screenWidth           Int?
  screenHeight          Int?
  devicePixelRatio      Float?
  throttlingRtt         Int?
  throttlingThroughput  Float?
  cpuSlowdown           Float?

  // Screenshot (base64 JPEG, auto-cleaned after SCREENSHOT_TTL_DAYS)
  screenshotData  String?  @db.Text

  // AI-generated content
  aiSummary       String?  @db.Text
  aiSummaryAt     DateTime?
  aiSummaryModel  String?
  healthReport    String?  @db.Text
  healthReportAt  DateTime?
  healthReportModel String?
  isFirstRun      Boolean  @default(false)

  monitor     Monitor          @relation(...)
  audits      Audit[]
  regressions RegressionAlert[]
}
```

#### Audit
```prisma
model Audit {
  id           String  @id @default(cuid())
  runId        String
  auditId      String  // PageSpeed audit identifier
  title        String
  score        Float?
  displayValue String?
  numericValue Float?
  run          Run     @relation(...)
}
```

#### RegressionBaseline
```prisma
model RegressionBaseline {
  id           String   @id @default(cuid())
  monitorId    String   @unique  // one baseline record per monitor
  metricName   String
  medianValue  Float
  sampleSize   Int
  calculatedAt DateTime @default(now())
  monitor      Monitor  @relation(...)
}
```

#### RegressionAlert
```prisma
model RegressionAlert {
  id            String   @id @default(cuid())
  runId         String
  metricName    String
  baselineValue Float
  actualValue   Float
  delta         Float
  percentChange Float
  severity      String   // "minor" | "moderate" | "critical"
  confidence    String   // "low" | "medium" | "high"
  likelyCauses  Json?    // root causes with evidence
  diffSummary   Json?    // before/after deltas

  // Status tracking
  status          String    @default("open")  // "open" | "acknowledged" | "resolved"
  acknowledgedAt  DateTime?
  acknowledgedBy  String?
  resolvedAt      DateTime?
  resolvedBy      String?
  notes           String?   @db.Text

  // AI fix-it suggestions
  fixItSuggestions      String?  @db.Text
  fixItSuggestionsAt    DateTime?
  fixItSuggestionsModel String?

  run Run @relation(...)
}
```

#### Integration / MonitorIntegration
```prisma
model Integration {
  id        String   @id @default(cuid())
  userId    String
  name      String
  type      String   // "slack" (extensible discriminated union)
  config    Json     // { type: "slack", webhookUrl: "..." }
  createdAt DateTime @default(now())
  monitors  MonitorIntegration[]
  user      User     @relation(...)
}

model MonitorIntegration {
  id            String      @id @default(cuid())
  integrationId String
  monitorId     String
  integration   Integration @relation(...)
  monitor       Monitor     @relation(...)
}
```

> **Convention:** Zero `MonitorIntegration` rows for an integration = fires for every run. Specific rows restrict to those monitors.

#### MonitorInsight
```prisma
model MonitorInsight {
  id              String   @id @default(cuid())
  monitorId       String
  metricName      String
  generatedAt     DateTime @default(now())
  summary         String   @db.Text
  recurrenceCount Int
  dominantCause   String?
  recommendation  String?  @db.Text
  model           String?
  inputHash       String?  // hash of input data for staleness detection
  monitor         Monitor  @relation(...)
}
```

#### ApiKey
```prisma
model ApiKey {
  id        String    @id @default(cuid())
  userId    String
  name      String
  keyHash   String    @unique   // SHA256 of raw key
  keyPrefix String              // first 13 chars (display only)
  lastUsedAt DateTime?
  expiresAt  DateTime?
  userAgent  String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  user       User      @relation(...)
}
```

### Key Indexes

```prisma
@@index([userId])                    // Site
@@index([siteId])                    // Monitor
@@index([isActive, nextRunAt])       // Scheduler queries
@@index([monitorId, completedAt])    // Run history
@@index([status])                    // Job status queries
@@index([monitorId])                 // RegressionBaseline, MonitorInsight
@@index([runId])                     // RegressionAlert
@@index([status, severity])          // Alert filtering
```

---

## Background Jobs & Workers

### BullMQ Queue Architecture

#### Queue Setup (`src/lib/queue.ts`)
```typescript
export interface AuditJobData {
  runId: string;
  monitorId: string;
  url: string;
  strategy: "mobile" | "desktop";
}

export const performanceQueue = new Queue<AuditJobData>("performance-audits", { connection: redis });
```

#### Worker Process (`src/worker/index.ts`)
Runs as a **separate Node.js process** (`pnpm dev:worker`).

Key responsibilities:
1. **Audit jobs**: fetch PSI → parse → store metrics/audits → detect regressions → fire integrations
2. **Digest jobs**: aggregate weekly data → send email digest

Concurrency: 5 audit jobs processed simultaneously.

#### Job Processor (`src/worker/processor.ts`)
```
1. Update run status → "running"
2. Call PageSpeed Insights API
3. Parse response (psi-parser.ts)
4. Store metrics + audits (DB transaction)
5. Update run status → "success"
6. Calculate regression baselines (baseline-calculator.ts)
7. Detect regressions (detector.ts + rules-engine.ts)
8. Save RegressionAlerts
9. Fire notification integrations (fire-and-forget)
10. Generate first-run health report (if isFirstRun, fire-and-forget)
```

On failure: update run status → "failed" with `errorMessage`.

#### Scheduler (`src/worker/scheduler.ts`)
Runs inside the worker process:

```typescript
// Every minute: find and enqueue due monitors
cron.schedule("* * * * *", async () => processDueMonitors());

// Monday 9 AM: enqueue weekly digest
cron.schedule("0 9 * * 1", async () => enqueueDigestJob());

// Daily 3 AM: clean up old screenshots
cron.schedule("0 3 * * *", async () => cleanupOldScreenshots(env.SCREENSHOT_TTL_DAYS));
```

**Screenshot TTL**: Default 30 days (configurable via `SCREENSHOT_TTL_DAYS`). Cleanup sets `screenshotData = null` on old runs (keeps the run record).

---

## Authentication & API Keys

### NextAuth.js v5 (Magic Link)
- Provider: Nodemailer (email magic links)
- Session strategy: JWT
- Adapter: PrismaAdapter
- Auth guard: `src/proxy.ts` (Edge middleware, first layer) + per-page `auth()` (belt-and-suspenders + user ID)
- Custom pages: `/auth/signin`, `/auth/verify-request`, `/auth/error`

### API Key Authentication (`src/lib/api-key-auth.ts`)
Programmatic access via Bearer token (for CLI and external integrations).

```typescript
// Key format: "side_" + nanoid(32)
generateApiKey()       // returns raw key (shown once)
hashApiKey(raw)        // SHA256 — only the hash is stored
resolveApiKeyUser(raw) // validates + fire-and-forget lastUsedAt update
```

**Limits:**
- Max 10 keys per user
- Optional expiration (1–365 days)
- API keys cannot mint new API keys (session only for `/api/keys POST`)

**Auth resolution** (`src/lib/resolve-user.ts`):
1. Check `Authorization: Bearer <key>` header → try API key lookup
2. Fall back to NextAuth session cookie

### CLI Login Flow
`GET /api/cli/login` returns a one-time token that the CLI exchanges for an API key. No user interaction with raw credentials.

---

## Regression Detection System

Located in `src/lib/regression/`. This is the most complex subsystem.

### Components

| File | Purpose |
|------|---------|
| `detector.ts` | Compares run metrics to baselines; emits `RegressionAlert` records |
| `baseline-calculator.ts` | Computes rolling medians over recent runs per metric |
| `rules-engine.ts` | Runs specialized root-cause rules against run data |
| `diff-engine.ts` | Produces before/after deltas (network, rendering, main thread) |
| `rules/render-blocking-rule.ts` | Detects render-blocking resources |
| `rules/cls-rule.ts` | CLS-specific causes (layout shifts) |
| `rules/lcp-resource-rule.ts` | LCP resource fetch issues |
| `rules/legacy-js-rule.ts` | Legacy JavaScript patterns |
| `rules/main-thread-rule.ts` | Main thread blocking tasks |
| `rules/third-party-rule.ts` | Third-party script impact |
| `rules/ttfb-rule.ts` | TTFB root causes |
| `rules/js-bloat-rule.ts` | JavaScript bundle size issues |

### Detection Thresholds

A regression is flagged only when **both** the percentage AND absolute thresholds are exceeded:

| Metric | % Threshold | Absolute Threshold |
|--------|-------------|-------------------|
| LCP | 15% | 300ms |
| TBT | 20% | 100ms |
| CLS | 25% | 0.05 |
| INP | 20% | 100ms |
| FCP | 15% | 300ms |
| TTFB | 20% | 200ms |

### Severity Levels
- **minor**: < 20% regression
- **moderate**: 20–50% regression
- **critical**: > 50% regression

### Confidence Levels
- **low**: first occurrence
- **medium**: 2 consecutive regressions
- **high**: 3+ consecutive regressions

### Integration with Worker
After a successful run, the processor calls:
```typescript
await calculateBaselines(monitorId);
const alerts = await detectRegressions(run, monitor);
await saveRegressionAlerts(alerts);
```

---

## GitHub Webhook Integration

### Overview
`triggerType` is a **first-class Monitor property** chosen at creation time and immutable:
- `"schedule"` — cron-based (default)
- `"deployment"` — fires on every successful GitHub `deployment_status` event

### Supported Platforms
Vercel, Netlify, Render, and any GitHub Actions workflow emitting `deployment_status` events.

### Flow
```
GitHub deploys → deployment_status (state: success, environment: production)
→ POST /api/webhooks/github/[monitorId]
→ HMAC-SHA256 signature verified (x-hub-signature-256)
→ Run created + enqueueAuditJob()
→ Worker fetches PSI → metrics stored
```

### Authentication
No user session. HMAC-SHA256 (`x-hub-signature-256` header) against `monitor.githubWebhookSecret`. The raw secret is auto-generated at creation (`randomBytes(32).toString("hex")`) and stored plaintext (verification requires the raw value). It is returned **once** in the creation API response.

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/github-webhook.ts` | `verifyGitHubSignature()` + `isSuccessfulDeployment()` |
| `src/app/api/webhooks/github/[monitorId]/route.ts` | Webhook receiver |
| `src/app/api/monitors/[id]/webhook-secret/route.ts` | Secret rotation (user auth) |
| `src/components/github-integration-panel.tsx` | Edit panel (deployment monitors only) |
| `src/components/monitor-form.tsx` | Two-step creation: type selector → fields → setup view |
| `docs/github-webhook-setup.md` | Developer setup guide |

---

## Notification Integrations

Users can connect Slack channels to receive post-audit notifications.

### Architecture

```
Worker (after regression detection)
→ fireIntegrations(ctx)          # src/lib/notifications/index.ts
→ queries DB for integrations    # filters by monitor scope
→ dispatcher.ts routes by type
→ slack.ts sends Block Kit payload
```

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/notifications/types.ts` | `NotificationContext`, `IntegrationConfig` discriminated union |
| `src/lib/notifications/slack.ts` | Block Kit payload builder, `sendSlackNotification()`, `sendSlackTestMessage()` |
| `src/lib/notifications/dispatcher.ts` | Routes by `config.type`; add `case` here for new providers |
| `src/lib/notifications/index.ts` | `fireIntegrations(ctx)` public entry point |

### Adding a New Provider (e.g. Discord)
1. Add type to `IntegrationConfig` union in `types.ts`
2. Create `src/lib/notifications/discord.ts`
3. Add `case "discord"` to `dispatcher.ts` (TS exhaustive check enforces completeness)
4. Add provider option to `integration-dialog.tsx`

No DB migration needed — `config Json` already handles any shape.

### SSRF Protection
Webhook URLs are validated against an allowlist (`hooks.slack.com` only) before storing.

---

## AI Features

All AI features use OpenAI `gpt-4o-mini`, the Vercel AI SDK for streaming, and Redis-based rate limiting. Feature flags (PostHog) gate each feature independently.

### AI Config (`src/lib/ai/constants.ts`)
Centralized config for all AI features (rate limits, cooldowns, staleness thresholds, model names).

### 1. Run AI Summary
- **Endpoint**: `POST /api/runs/[id]/ai-summary`
- **Cached on**: `Run.aiSummary`, `Run.aiSummaryAt`, `Run.aiSummaryModel`
- **Rate limit**: 5 per day per user
- **Per-run cooldown**: 60 minutes
- **Feature flag**: `FEATURE_FLAGS.RUN_AI_SUMMARY`
- **Response**: Streaming text

### 2. Fix-It Code Suggestions
- **Endpoint**: `POST /api/regressions/[alertId]/code-suggestions`
- **Cached on**: `RegressionAlert.fixItSuggestions`, `.fixItSuggestionsAt`, `.fixItSuggestionsModel`
- **Rate limit**: 5 per day per user
- **Per-alert cooldown**: 60 minutes
- **Feature flag**: `FEATURE_FLAGS.FIX_IT_SUGGESTIONS`
- **Behavior**: Filters relevant audits by detected regression causes; streams code suggestions
- **Helpers**: `buildFixItSuggestionsPrompt()`, `parseRegressionCauses()`, `parseDiffSummary()`, `getRelevantAuditIds()`

### 3. Background Pattern Insights
- **Endpoint**: `GET /api/monitors/[id]/pattern-insights`
- **Cached on**: `MonitorInsight` model
- **API rate limit**: 30 per day per user
- **Generation rate limit**: 5 per day per user
- **Staleness threshold**: 24 hours
- **Min regressions required**: 3 (within 90-day lookback)
- **Redis lock**: `GENERATION_LOCK_TTL_SECONDS: 120` — prevents concurrent generation
- **Feature flag**: `FEATURE_FLAGS.PATTERN_INSIGHT`
- **Behavior**: Returns cached insight immediately; triggers background regeneration if stale/missing

### 4. First-Run Health Reports
- **Triggered**: Once per monitor lifetime, on the first successful run
- **Cached on**: `Run.healthReport`, `Run.healthReportAt`, `Run.healthReportModel`
- **Rate limit**: 5 per day per user
- **Feature flag**: `FEATURE_FLAGS.HEALTH_REPORT` (or similar)
- **Behavior**: Fire-and-forget from worker after first run completes

---

## CLI

A separate workspace package (`cli/`) providing a terminal interface to the PerfLabs API.

### Structure
```
cli/
├── src/
│   ├── index.ts          # Entry point (bin: ./dist/cli/src/index.js)
│   ├── client.ts         # API client (Bearer token auth)
│   ├── config.ts         # Config management (~/.config/perflabs)
│   ├── ui.tsx            # React (Ink) UI components
│   ├── types/api.ts      # Shared type definitions
│   └── commands/
│       ├── auth.ts       # Login / logout
│       ├── sites.tsx     # List / manage sites
│       ├── monitors.tsx  # List / manage monitors
│       └── run.tsx       # Trigger manual run
├── package.json
└── tsconfig.json         # module=ESNext, moduleResolution=bundler
```

### Build
```bash
pnpm cli:build   # compiles TypeScript → dist/
```

### Auth Flow
`cli auth login` → calls `GET /api/cli/login` → browser opens → user authenticates → API key returned to CLI → stored in local config.

---

## Alerts System

### Endpoint
`GET /api/alerts?days=30&severity=critical&status=open&limit=20&cursor=...`

### Features
- **Cursor-based pagination** (cursor encodes: severity → createdAt → id)
- **Date filtering**: specific day OR rolling N-day window
- **Severity filter**: `critical` | `moderate` | `minor`
- **Status filter**: `open` | `acknowledged` | `resolved`
- **Limit**: 0–100 (default 20)
- **Response**: `{ alerts[], nextCursor, hasMore }`

### Alert Status Transitions
```
open → acknowledged (user acknowledges; records acknowledgedAt + acknowledgedBy)
open/acknowledged → resolved (user resolves; records resolvedAt + resolvedBy + optional notes)
```

### Related
- `GET /api/alerts/dates` — returns dates that have alerts (for calendar UI)
- `GET /api/runs/[id]/regressions` — regressions for a specific run
- `GET /api/regressions/[alertId]` — single alert detail
- `PATCH /api/regressions/[alertId]` — update alert status

---

## Weekly Digest

### Overview
Monday 9 AM UTC: users with `weeklyDigestEnabled = true` receive an email summarizing the past week's performance data.

### Flow
```
Scheduler (Monday 9 AM)
→ enqueueDigestJob()
→ Worker: processDigestJob()
→ aggregateUserDigest(userId)  # per-user aggregation
→ sendDigestEmail(data)        # Nodemailer
```

Per-user error handling: one user's failure does not block others.

### Key Files
| File | Purpose |
|------|---------|
| `src/worker/digest-processor.ts` | BullMQ job handler |
| `src/lib/digest/aggregator.ts` | Aggregates weekly metrics |
| `src/lib/digest/sender.ts` | Sends email via Nodemailer |
| `src/components/digest-toggle.tsx` | UI toggle for `weeklyDigestEnabled` |
| `POST /api/digest/trigger` | Dev-only manual trigger (no waiting for Monday) |
| `POST /api/digest/unsubscribe` | Unsubscribe endpoint |

---

## Feature Flags

Feature flags are managed via **PostHog** and evaluated server-side.

### Flags
| Flag | Feature |
|------|---------|
| `RUN_AI_SUMMARY` | AI-generated run summaries |
| `FIX_IT_SUGGESTIONS` | Fix-it code suggestions per regression alert |
| `PATTERN_INSIGHT` | Background pattern insights |
| `HEALTH_REPORT` | First-run site health reports |

See `docs/FEATURE_FLAGS.md` for full documentation.

---

## Key Data Flows

### 1. Scheduled Audit Flow
```
Scheduler (every minute)
→ query: isActive=true AND nextRunAt <= now
→ for each due monitor:
  1. Create Run (status: "queued")
  2. Enqueue BullMQ job
  3. Update nextRunAt = now + cadenceMinutes
→ Worker picks up job
→ PSI fetch → parse → store → regression detection → notifications
```

### 2. Manual Run Flow
```
User clicks "Run Now"
→ POST /api/monitors/[id]/run
→ 1. Auth check (resolveUser)
→ 2. Rate limit check (5/min per user)
→ 3. Idempotency check (any job queued/running in last 60s?)
→ 4. Create Run (status: "queued")
→ 5. Enqueue BullMQ job
→ 6. Return run ID
→ Worker → same flow as scheduled
→ UI polls GET /api/runs/[id] → displays results
```

### 3. Deployment Trigger Flow
```
GitHub deploys (Vercel, Netlify, Render, etc.)
→ POST /api/webhooks/github/[monitorId]
→ HMAC-SHA256 signature verified
→ isSuccessfulDeployment() check
→ Create Run + enqueueAuditJob()
→ Worker → same flow as scheduled
```

### 4. Regression Detection Flow
```
Worker: processAuditJob() succeeds
→ calculateBaselines(monitorId)   # rolling median
→ detectRegressions(run, monitor) # compare to baseline
  → rules-engine.ts runs 8 rules (root cause analysis)
  → diff-engine.ts computes before/after deltas
→ saveRegressionAlerts([...])
→ fireIntegrations(ctx)           # Slack notifications
→ if isFirstRun: generateHealthReport() (fire-and-forget)
```

### 5. AI Fix-It Flow
```
User views RegressionAlert
→ POST /api/regressions/[alertId]/code-suggestions
→ Check feature flag (PostHog)
→ Check rate limit (5/day per user)
→ Check per-alert cooldown (60 min)
→ parseRegressionCauses(alert.likelyCauses)
→ getRelevantAuditIds(causes)
→ buildFixItSuggestionsPrompt(alert, audits)
→ OpenAI gpt-4o-mini (streaming)
→ Cache on RegressionAlert.fixItSuggestions
→ Stream back to client
```

---

## Development Workflow

### Setup
```bash
git clone <repo-url> && cd side
pnpm install
cp .env.example .env  # fill in values
docker compose up -d  # PostgreSQL + Redis
pnpm prisma migrate dev --name init
pnpm dev:all          # Next.js + worker concurrently
```

### Commands
```bash
pnpm dev              # Next.js only
pnpm dev:worker       # Worker only
pnpm dev:all          # Both

pnpm test             # Vitest unit/integration tests
pnpm test:e2e         # Playwright E2E

pnpm lint
pnpm tsc --noEmit

# Schema changes — always create a migration file
pnpm prisma migrate dev --name describe_your_change
pnpm prisma migrate deploy   # apply pending migrations to prod

pnpm seed:regressions email [name] [numAlerts]  # seed alerts for testing
pnpm cleanup:screenshots [days]                 # manual screenshot cleanup
pnpm cli:build                                  # build CLI package
```

### Adding New Features

#### New Database Model
```bash
# Edit prisma/schema.prisma
pnpm prisma migrate dev --name your_change
pnpm prisma generate
```

#### New Notification Provider
1. Add type to `IntegrationConfig` in `src/lib/notifications/types.ts`
2. Create `src/lib/notifications/<provider>.ts`
3. Add `case "<provider>"` to `src/lib/notifications/dispatcher.ts`
4. Add option to `src/components/integration-dialog.tsx`

#### New AI Feature
1. Add feature flag to PostHog + `src/lib/feature-flags.ts`
2. Add constants to `src/lib/ai/constants.ts`
3. Create prompt builder in `src/lib/ai/prompt-builder.ts`
4. Add API route with rate limiting + caching pattern
5. Add Prisma fields for caching (model field + `*At` + `*Model`)

---

## File Structure

```
side/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── sitemap.ts          # SEO sitemap
│   │   ├── robots.ts           # SEO robots.txt
│   │   ├── api/                # API routes (see full listing above)
│   │   ├── dashboard/
│   │   ├── sites/[id]/
│   │   ├── runs/[id]/
│   │   ├── alerts/             # Regression alerts page
│   │   ├── history/            # Cross-site run history
│   │   ├── settings/           # API keys + digest toggle
│   │   └── auth/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── site-form.tsx
│   │   ├── monitor-form.tsx    # Two-step: trigger type → fields
│   │   ├── metrics-chart.tsx
│   │   ├── run-button.tsx
│   │   ├── score-card.tsx
│   │   ├── alerts-list.tsx
│   │   ├── integrations-manager.tsx
│   │   ├── integration-dialog.tsx
│   │   ├── github-integration-panel.tsx
│   │   ├── api-key-manager.tsx
│   │   └── digest-toggle.tsx
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config
│   │   ├── resolve-user.ts     # Bearer key OR session
│   │   ├── api-key-auth.ts     # API key utils
│   │   ├── prisma.ts
│   │   ├── queue.ts            # BullMQ queue
│   │   ├── redis.ts
│   │   ├── rate-limit.ts
│   │   ├── psi-parser.ts       # PageSpeed response parser
│   │   ├── url-utils.ts
│   │   ├── metrics-compare.ts
│   │   ├── github-webhook.ts   # HMAC verify + deployment check
│   │   ├── feature-flags.ts    # PostHog feature flag wrappers
│   │   ├── regression/         # Regression detection subsystem
│   │   │   ├── detector.ts
│   │   │   ├── baseline-calculator.ts
│   │   │   ├── rules-engine.ts
│   │   │   ├── diff-engine.ts
│   │   │   └── rules/          # 8 specialized root-cause rules
│   │   ├── notifications/      # Notification integrations
│   │   │   ├── types.ts
│   │   │   ├── slack.ts
│   │   │   ├── dispatcher.ts
│   │   │   └── index.ts
│   │   ├── ai/                 # AI feature helpers
│   │   │   ├── constants.ts
│   │   │   ├── prompt-builder.ts
│   │   │   ├── health-report.ts
│   │   │   └── pattern-insight.ts
│   │   └── digest/             # Weekly digest
│   │       ├── aggregator.ts
│   │       └── sender.ts
│   ├── worker/
│   │   ├── index.ts            # Worker entry point
│   │   ├── processor.ts        # Audit job processor
│   │   ├── digest-processor.ts # Digest job processor
│   │   └── scheduler.ts        # Cron scheduler
│   ├── proxy.ts                # Edge auth middleware
│   ├── env.js                  # T3 Env validation
│   └── types/
│       ├── next-auth.d.ts
│       ├── prisma.ts           # Prisma query types
│       └── api.ts              # Shared API interfaces
├── cli/                        # CLI workspace package
│   └── src/
│       ├── index.ts
│       ├── client.ts
│       ├── config.ts
│       ├── ui.tsx
│       └── commands/
├── prisma/schema.prisma
├── e2e/                        # Playwright E2E tests
├── docs/                       # Architecture + feature docs
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.example
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<random>

# Email
EMAIL_SERVER=smtp://...
EMAIL_FROM=noreply@your-domain.com

# PageSpeed Insights
GOOGLE_PAGESPEED_API_KEY=<key>

# AI
OPENAI_API_KEY=<key>

# Feature Flags
NEXT_PUBLIC_POSTHOG_KEY=<key>
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Screenshot TTL
SCREENSHOT_TTL_DAYS=30  # default: 30

# Internal scheduler auth
SCHEDULER_SECRET=<random>
```

All env vars are validated at startup via `src/env.js` (T3 Env pattern).

---

## Troubleshooting

| Symptom | Likely Cause |
|---------|-------------|
| Email not sending | Check `EMAIL_SERVER` credentials |
| Worker not processing | Verify Redis connection |
| Rate limit errors | Increase limits or add delay |
| TypeScript errors | Run `pnpm prisma generate` |
| Database migration drift | Use `prisma migrate deploy` on feature branches; see `docs/weekly-digest.md` migration section |
| AI features not showing | Check PostHog feature flag is enabled for user |
| Webhook signature invalid | Ensure raw secret (not hashed) is configured in GitHub |
