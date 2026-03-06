# Web Performance Lab

A production-ready web performance monitoring application built with Next.js 15, featuring automated PageSpeed Insights audits, scheduled monitoring, and comprehensive performance analytics.

> 📖 **For detailed architecture and implementation documentation, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md)**
>
> 🧪 **For testing setup, tools, and conventions, see [TESTING.md](./docs/TESTING.md)**
>
> 🗄️ **For database seed and cleanup scripts, see [DATABASE_SCRIPTS.md](./docs/DATABASE_SCRIPTS.md)**
>
> 📈 **For the Run History page and its seed scripts, see [docs/RUN-HISTORY.md](./docs/RUN-HISTORY.md)**

## Features

- 🚀 **Site Monitoring**: Track multiple websites with customizable monitoring schedules
- 📊 **Performance Metrics**: Core Web Vitals (LCP, INP, CLS, FCP, TTFB), Lighthouse scores, and environment metadata (browser user agent, benchmark index, form factor)
- 📸 **Visual Snapshots**: Capture and store page screenshots with each audit
- 📈 **Trend Analysis**: Visualize performance over time with interactive charts
- 🔄 **Automated Audits**: Background worker with cron scheduler for periodic testing
- 🎯 **Manual Runs**: On-demand performance audits with rate limiting
- 📅 **Run History**: Dedicated history page with site/monitor selector, 7d/14d/30d date range, Scores and Core Web Vitals chart tabs, and a full-detail run table
- 📉 **Run Comparison**: Side-by-side comparison of metrics, audits, and screenshots
- 🤖 **AI Analysis**: GPT-4o-mini powered narrative summaries with prioritized action items for each run
- 💻 **CLI**: Terminal client for triggering runs, inspecting results, and managing sites without leaving the terminal
- 🔐 **Authentication**: Google, GitHub, and email magic link authentication via NextAuth
- ⚡ **Queue System**: BullMQ-powered job processing with retry logic
- 🧹 **Auto-Cleanup**: Automatic screenshot TTL policy to manage database size
- 🎨 **Modern UI**: Beautiful interface built with shadcn/ui and Tailwind CSS

## Tech Stack

### Core
- **Next.js 15** (App Router) - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

### Database & ORM
- **PostgreSQL** - Primary database
- **Prisma** - Type-safe ORM

### Authentication
- **NextAuth v5** - Google, GitHub, and email magic link authentication
- **Prisma Adapter** - Database session storage

### Queue & Worker
- **BullMQ** - Job queue management
- **Redis** - Queue backing store
- **node-cron** - Scheduled job execution

### AI & Analytics
- **OpenAI GPT-4o-mini** - AI-generated run summaries (via Vercel AI SDK)
- **Google PageSpeed Insights API** - Performance audits
- **Zod** - Runtime validation
- **Recharts** - Data visualization

## Architecture Overview

The application follows a **Next.js monorepo** structure with a separate **background worker process**:

```
┌─────────────────┐
│  Next.js App    │
│  (UI + API)     │
└────────┬────────┘
         │
    ┌────┴────┐
    ├─────────┼──────────┐
    │         │          │
┌───▼───┐ ┌──▼───┐ ┌────▼────┐
│Prisma │ │Redis │ │ BullMQ  │
│  ORM  │ │(Rate │ │ Queue   │
└───┬───┘ │Limit)│ └────┬────┘
    │     └──────┘      │
┌───▼─────────┐    ┌────▼─────┐
│  PostgreSQL │    │  Worker  │
│  Database   │    │  Process │
└─────────────┘    └────┬─────┘
                        │
                   ┌────▼────┐
                   │   PSI   │
                   │   API   │
                   └─────────┘
```

**📚 For comprehensive architecture documentation, including:**
- Detailed component diagrams
- Data flow explanations
- Backend patterns and best practices
- Frontend architecture details
- Database schema and relationships
- Background job processing
- Authentication flow

**See [ARCHITECTURE.md](./docs/ARCHITECTURE.md)**

## Prerequisites

- **Node.js** 20.x or higher
- **Docker** and **Docker Compose**
- **pnpm** (recommended) or npm
- **Google PageSpeed Insights API key** ([Get one here](https://developers.google.com/speed/docs/insights/v5/get-started))

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd side
pnpm install
```

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://perflab:perflab@localhost:5432/perflab?schema=public"

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email (SMTP for magic links — optional if only using OAuth)
EMAIL_SERVER="smtp://user:password@smtp.example.com:587"
EMAIL_FROM="noreply@example.com"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# PageSpeed Insights API
PAGESPEED_API_KEY="your-api-key-here"

# Scheduler (generate with: openssl rand -base64 32)
SCHEDULER_SECRET="your-scheduler-secret-here"

# Rate limiting
RATE_LIMIT_RUNS_PER_DAY="100"

# Screenshot cleanup (TTL in days)
SCREENSHOT_TTL_DAYS="30"

# OpenAI (for AI run summaries)
OPENAI_API_KEY="sk-..."

# Environment
NODE_ENV="development"
```

### 3. Start Infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

### 4. Database Migration

Run Prisma migrations to set up the database schema:

```bash
pnpm prisma generate
pnpm prisma db push
```

### 5. Run the Application

You have two options:

**Option A: Run everything together (recommended for development)**

```bash
pnpm dev:all
```

This starts both the Next.js app and the worker process concurrently.

**Option B: Run separately**

Terminal 1 - Next.js app:
```bash
pnpm dev
```

Terminal 2 - Worker process:
```bash
pnpm dev:worker
```

### 6. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

You'll be redirected to the sign-in page. Enter your email to receive a magic link.

## Project Structure

```
/
├── cli/                       # Terminal CLI (pnpm workspace package)
│   ├── src/
│   │   ├── index.ts           # Command entry point
│   │   ├── client.ts          # HTTP client (Bearer auth)
│   │   ├── config.ts          # Persistent config (~/.config/side-cli/)
│   │   ├── format.ts          # Output formatters
│   │   ├── ui.tsx             # ink terminal components
│   │   └── commands/          # auth, sites, monitors, run
│   └── README.md              # Full CLI documentation
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── cli/           # CLI device-flow auth (login/poll)
│   │   │   ├── keys/          # API key management
│   │   │   ├── sites/         # Site CRUD
│   │   │   ├── monitors/      # Monitor CRUD + run trigger
│   │   │   ├── runs/          # Run details + comparison
│   │   │   └── scheduler/     # Scheduler trigger endpoint
│   │   ├── (app)/             # Sidebar layout group
│   │   │   ├── dashboard/     # Main dashboard page
│   │   │   ├── sites/[id]/    # Site detail page
│   │   │   ├── runs/[id]/     # Run detail + comparison pages
│   │   │   ├── alerts/        # Regression alerts
│   │   │   └── settings/      # API key management UI
│   │   ├── cli/authorize/     # Browser authorization page (device flow)
│   │   └── auth/              # Auth pages (signin, verify)
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── site-form.tsx      # Site creation form
│   │   ├── monitor-form.tsx   # Monitor creation form
│   │   ├── run-button.tsx     # Manual run trigger
│   │   ├── score-badge.tsx    # Score visualization
│   │   └── metrics-chart.tsx  # Performance charts
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── prisma.ts          # Prisma client
│   │   ├── redis.ts           # Redis client
│   │   ├── queue.ts           # BullMQ queue setup
│   │   ├── api-key-auth.ts    # API key generation and hashing
│   │   ├── resolve-user.ts    # Bearer token + session resolution
│   │   ├── psi-parser.ts      # PageSpeed Insights parser
│   │   └── regression/        # Regression detection engine
│   ├── worker/
│   │   ├── index.ts           # Worker entry point
│   │   ├── processor.ts       # Job processing logic
│   │   └── scheduler.ts       # Cron scheduler
│   ├── types/
│   │   ├── api.ts             # Shared API response types (used by CLI too)
│   │   └── next-auth.d.ts     # NextAuth type extensions
│   └── env.js                 # Environment validation
├── docker-compose.yml         # Postgres + Redis
├── .env.example               # Environment template
├── package.json               # Dependencies and scripts
├── README.md                  # This file
└── docs/                      # Documentation
    ├── ARCHITECTURE.md        # Detailed architecture docs
    ├── DATABASE_SCRIPTS.md    # Seed and cleanup scripts
    └── TESTING.md             # Testing guide and conventions
```

**📖 For detailed explanations of each component and module, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md)**

## Key Workflows

### Creating a Site and Monitor

1. Sign in with your email
2. Click "Create Site" on the dashboard
3. Enter site name and URL
4. Navigate to the site detail page
5. Click "Create Monitor" to set up automated auditing
6. Configure cadence (how often to run) and strategy (mobile/desktop)

### Manual Run

1. Navigate to a site detail page
2. Find the monitor you want to test
3. Click "Run Now"
4. The run will be queued and processed by the worker
5. Refresh the page to see results

### Viewing Results

- **Dashboard**: Overview of all sites with latest scores
- **Site Detail**: Timeline charts and run history per monitor
- **Run History**: Cross-monitor history with date-range filtering and CWV chart tab
- **Run Detail**: Complete metrics, scores, and audits
- **Run Comparison**: Side-by-side comparison of two runs

### Scheduled Monitoring

The worker's built-in cron scheduler runs every minute and:
1. Finds all active monitors where `nextRunAt <= now`
2. Creates a run and enqueues a job
3. Updates `nextRunAt` based on `cadenceMinutes`
4. Processes the job via BullMQ worker

## API Endpoints

### Sites
- `GET /api/sites` - List user sites
- `POST /api/sites` - Create site
- `GET /api/sites/[id]` - Get site details
- `PUT /api/sites/[id]` - Update site
- `DELETE /api/sites/[id]` - Delete site

### Monitors
- `GET /api/monitors?siteId=X` - List monitors
- `POST /api/monitors` - Create monitor
- `PUT /api/monitors/[id]` - Update monitor
- `DELETE /api/monitors/[id]` - Delete monitor
- `POST /api/monitors/[id]/run` - Trigger manual run (rate limited)

### Runs
- `GET /api/runs?monitorId=X` - List runs
- `GET /api/runs/[id]` - Get run details
- `GET /api/runs/[id]/compare/[id2]` - Compare two runs
- `POST /api/runs/[id]/ai-summary` - Generate (or regenerate) an AI summary for a run (streams response)

### Scheduler
- `POST /api/scheduler/tick` - Trigger scheduler (requires `x-scheduler-secret` header)

### CLI Auth (device flow)
- `POST /api/cli/login` - Start device flow; returns `{ loginCode, authorizeUrl }`
- `GET /api/cli/login?code=X` - Poll for authorization status; returns raw API key once on success

### API Keys
- `GET /api/keys` - List API keys for the authenticated user
- `POST /api/keys` - Create a named API key (returns raw key once)
- `DELETE /api/keys/[id]` - Revoke a key

## Rate Limiting

Manual runs are rate limited per user per day:
- Default: 100 runs/day
- Configurable via `RATE_LIMIT_RUNS_PER_DAY`
- Uses Redis for distributed tracking
- Resets at midnight

## Screenshot Management

Screenshots from PageSpeed Insights are automatically captured and stored:
- **Storage**: Base64-encoded JPEG in PostgreSQL
- **Display**: Click-to-zoom thumbnails on run detail pages
- **Comparison**: Side-by-side screenshots when comparing runs
- **TTL Policy**: Automatic cleanup of screenshots older than 30 days (configurable via `SCREENSHOT_TTL_DAYS`)
- **Cleanup Schedule**: Runs daily at 3 AM via the worker's cron scheduler
- **Manual Cleanup**: Run `pnpm cleanup:screenshots [days]` to manually clean up screenshots

## Deployment

### Production Build

```bash
# Build Next.js app
pnpm build

# Build worker
pnpm build:worker

# Start Next.js
pnpm start

# Start worker (separate process/container)
pnpm start:worker
```

### Environment Variables

Ensure all production environment variables are set:
- Use strong secrets for `NEXTAUTH_SECRET` and `SCHEDULER_SECRET`
- Configure production SMTP server for `EMAIL_SERVER`
- Set `NEXTAUTH_URL` to your production domain
- Use managed PostgreSQL and Redis for production
- Secure `PAGESPEED_API_KEY`

### Docker Deployment

For production, deploy the application and worker as separate containers:

1. **Next.js App**: Handles HTTP requests
2. **Worker Process**: Processes queue jobs and runs scheduler
3. **PostgreSQL**: Database
4. **Redis**: Queue and rate limiting

### Scaling

- **Horizontal**: Run multiple worker processes for parallel job processing
- **Queue Concurrency**: Adjust BullMQ concurrency in `src/worker/index.ts`
- **Database**: Use connection pooling (Prisma supports this)
- **Redis**: Use Redis Cluster for high availability

## CLI

The `cli/` directory is a pnpm workspace package (`@side/cli`) that provides a terminal interface to the web app's API. It has no direct database access — all operations go through the same API routes used by the web UI.

```sh
# Authenticate (opens browser, saves API key to ~/.config/side-cli/)
side auth --url https://yourapp.com

# List sites and their monitors
side sites list

# Create a site (--monitor also creates a default mobile monitor)
side sites add https://example.com --name "Example" --monitor

# Trigger an on-demand PSI run and stream results
side run <monitorId>
```

**Setup:**

```sh
pnpm cli:build               # compile TypeScript
node cli/dist/cli/src/index.js auth --url http://localhost:3000

# or link globally:
cd cli && pnpm link --global
side auth
```

**All CLI scripts (run from repo root):**

| Script | Description |
|---|---|
| `pnpm cli:build` | Compile TypeScript to `cli/dist/` |
| `pnpm cli:dev` | Watch mode |
| `pnpm cli:lint` | ESLint on `cli/src/` |
| `pnpm cli:test` | Vitest unit tests |
| `pnpm cli:test:watch` | Vitest watch mode |

For full CLI documentation including all commands, auth flow, CI/CD usage, and shared types contract, see **[cli/README.md](./cli/README.md)**.

---

## Development

### Database Seed and Cleanup Scripts

For seeding test data and cleaning up the database during development, see **[DATABASE_SCRIPTS.md](./docs/DATABASE_SCRIPTS.md)**.

Quick reference:

```bash
# Seed regression alerts
pnpm seed:regressions your-email@example.com

# Seed Run History test data (gradual decline / improvement)
pnpm seed:decline your-email@example.com
pnpm seed:improvement your-email@example.com

# Clean database (preserves users/sessions)
pnpm seed:clean

# Fresh start: clean + seed
pnpm seed:clean && pnpm seed:regressions your-email@example.com
```

### Database Changes

After modifying `prisma/schema.prisma`:

```bash
pnpm prisma generate
pnpm prisma db push
```

For production migrations:

```bash
pnpm prisma migrate dev --name <migration-name>
```

### Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

### Testing

```bash
# Run unit / integration / component tests (web app)
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests (Playwright)
pnpm test:e2e

# CLI unit tests
pnpm cli:test
pnpm cli:test:watch
```

For full details on the testing strategy, tools, and conventions, see **[TESTING.md](./docs/TESTING.md)**.

### Type Checking

```bash
# Web app (cli/ is excluded)
pnpm tsc --noEmit
```

### Linting

```bash
# Web app (cli/ is excluded)
pnpm lint

# CLI
pnpm cli:lint
```

## Analytics

This project uses [PostHog](https://posthog.com) for product analytics. The client is initialized in `src/instrumentation-client.ts`, which Next.js 15.3+ loads automatically — no manual imports required.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Production | Your PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Production | PostHog ingestion host (e.g. `https://us.i.posthog.com`) |
| `NEXT_PUBLIC_POSTHOG_ENABLED` | Dev only | Set to `"true"` to enable PostHog in local development |

PostHog is always enabled in `production`. In other environments it only runs when `NEXT_PUBLIC_POSTHOG_ENABLED=true` is set in `.env.local`.

### Event naming convention

All event names must be **lowercase with underscores** (`snake_case`):

```ts
// good
posthog.capture("site_created")
posthog.capture("manual_run_triggered")

// bad — don't use these patterns
posthog.capture("siteCreated")
posthog.capture("Site Created")
posthog.capture("SITE_CREATED")
```

### Defining event names

Prefer a `const` object with `as const` over a TypeScript `enum`. Enums compile to runtime JavaScript; `as const` is zero-cost and lets you derive a union type automatically:

```ts
// src/lib/analytics-events.ts
export const AnalyticsEvent = {
  site_created: "site_created",
  site_deleted: "site_deleted",
  monitor_created: "monitor_created",
  manual_run_triggered: "manual_run_triggered",
  alert_viewed: "alert_viewed",
} as const;

export type AnalyticsEventName = typeof AnalyticsEvent[keyof typeof AnalyticsEvent];
```

Then import and use it anywhere:

```ts
import posthog from "posthog-js";
import { AnalyticsEvent } from "@/lib/analytics-events";

posthog.capture(AnalyticsEvent.site_created, { url: site.url });
```

### Useful links

- [PostHog Next.js integration guide](https://posthog.com/docs/libraries/next-js)
- [posthog.capture() API reference](https://posthog.com/docs/libraries/js#capturing-events)
- [Event properties best practices](https://posthog.com/docs/data/events)
- [Feature flags](https://posthog.com/docs/feature-flags)
- [Session replay](https://posthog.com/docs/session-replay)

## Observability (Sentry)

This project uses [Sentry](https://sentry.io) for error monitoring, performance tracing, session replay, and cron job health tracking across the Next.js app and the background worker process.

> 📖 **For detailed architecture and implementation documentation, see [docs/sentry-integration.md](./docs/sentry-integration.md)**

### What Sentry captures

- **Errors** — unhandled exceptions, promise rejections, API route failures, worker job crashes
- **Traces** — server request timing, client navigation spans, Web Vitals (LCP, CLS, FCP, TTFB)
- **Session Replay** — video-like reproductions of user sessions when errors occur
- **Cron health** — missed, failed, or timed-out scheduled jobs in the worker

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `SENTRY_DSN` | Optional | Server-side DSN for the Next.js server and worker process |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Client-side DSN (safe to expose in browser bundle) |
| `SENTRY_AUTH_TOKEN` | CI only | Auth token for source map uploads during production builds |
| `SENTRY_ORG` | CI only | Sentry organization slug |
| `SENTRY_PROJECT` | CI only | Sentry project slug |

Sentry is optional — the app runs without it when DSN variables are not set. The SDK silently no-ops.

### Local development setup

To test Sentry locally:

1. Create a free account at [sentry.io](https://sentry.io) and create a Next.js project
2. Copy the DSN from **Settings → Projects → Client Keys (DSN)**
3. Add to your `.env`:

```env
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/0
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o0.ingest.sentry.io/0
```

4. Restart the dev server (`pnpm dev:all`)

To see SDK debug logs in the console, temporarily add `debug: true` to any `Sentry.init()` call.

### Verifying the setup

Throw a test error in a client component or API route:

```typescript
// In any client component — click a button that runs this:
throw new Error("Sentry test error — delete me");

// Or in any API route:
import * as Sentry from "@sentry/nextjs";
Sentry.captureException(new Error("Sentry test error — delete me"));
```

Check [sentry.io/issues/](https://sentry.io/issues/) — the error should appear within ~30 seconds.

### Useful links

- [Sentry Next.js integration docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Session Replay privacy configuration](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/privacy/)
- [Cron Monitoring](https://docs.sentry.io/product/crons/)
- [Source map setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/)

## OAuth Setup

### Google

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application** as the application type
6. Add `http://localhost:3000` to **Authorized JavaScript origins**
7. Add `http://localhost:3000/api/auth/callback/google` to **Authorized redirect URIs**
8. Copy the Client ID and Client Secret into your `.env`

### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set **Homepage URL** to `http://localhost:3000`
4. Set **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`
5. Click **Register application**
6. Copy the Client ID and generate a Client Secret, then add both to your `.env`

> For production, replace `http://localhost:3000` with your production URL in both providers.

## Troubleshooting

### Worker not processing jobs

1. Check Redis connection: `docker-compose ps`
2. Check worker logs: `pnpm dev:worker`
3. Verify environment variables in `.env`

### Database connection errors

1. Ensure PostgreSQL is running: `docker-compose ps`
2. Verify `DATABASE_URL` in `.env`
3. Check Prisma schema: `pnpm prisma studio`

### PageSpeed Insights API errors

1. Verify API key is valid
2. Check API quotas and limits
3. Review worker logs for error messages

### Email magic links not sending

1. Verify SMTP configuration in `.env`
2. Test SMTP credentials
3. Check email provider logs

## Contributing

We welcome contributions! Before getting started:

1. **Read the documentation**: Check out [ARCHITECTURE.md](./docs/ARCHITECTURE.md) to understand the codebase
2. **Fork the repository**
3. **Create a feature branch**: `git checkout -b feature/amazing-feature`
4. **Make your changes**: Follow the code style and patterns in the codebase
5. **Test your changes**: Run `pnpm test` and ensure all tests pass
6. **Run linting**: `pnpm lint`
7. **Submit a pull request**: Include a clear description of your changes

### For New Contributors

- Review [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed implementation patterns
- Start with small changes to get familiar with the codebase
- Ask questions by opening an issue

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
