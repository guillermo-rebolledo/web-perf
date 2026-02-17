# Web Performance Lab

A production-ready web performance monitoring application built with Next.js 15, featuring automated PageSpeed Insights audits, scheduled monitoring, and comprehensive performance analytics.

> 📖 **For detailed architecture and implementation documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)**
>
> 🧪 **For testing setup, tools, and conventions, see [TESTING.md](./TESTING.md)**

## Features

- 🚀 **Site Monitoring**: Track multiple websites with customizable monitoring schedules
- 📊 **Performance Metrics**: Core Web Vitals (LCP, INP, CLS, FCP, TTFB) and Lighthouse scores
- 📸 **Visual Snapshots**: Capture and store page screenshots with each audit
- 📈 **Trend Analysis**: Visualize performance over time with interactive charts
- 🔄 **Automated Audits**: Background worker with cron scheduler for periodic testing
- 🎯 **Manual Runs**: On-demand performance audits with rate limiting
- 📉 **Run Comparison**: Side-by-side comparison of metrics, audits, and screenshots
- 🔐 **Authentication**: Secure email magic link authentication via NextAuth
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
- **NextAuth v5** - Email magic link authentication
- **Prisma Adapter** - Database session storage

### Queue & Worker
- **BullMQ** - Job queue management
- **Redis** - Queue backing store
- **node-cron** - Scheduled job execution

### Analytics & Validation
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

**See [ARCHITECTURE.md](./ARCHITECTURE.md)**

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

# Email (SMTP for magic links)
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
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── sites/         # Site CRUD
│   │   │   ├── monitors/      # Monitor CRUD + run trigger
│   │   │   ├── runs/          # Run details + comparison
│   │   │   └── scheduler/     # Scheduler trigger endpoint
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── sites/[id]/        # Site detail page
│   │   ├── runs/[id]/         # Run detail + comparison pages
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
│   │   ├── url-utils.ts       # URL canonicalization
│   │   ├── rate-limit.ts      # Rate limiting logic
│   │   ├── psi-parser.ts      # PageSpeed Insights parser
│   │   └── metrics-compare.ts # Run comparison logic
│   ├── worker/
│   │   ├── index.ts           # Worker entry point
│   │   ├── processor.ts       # Job processing logic
│   │   └── scheduler.ts       # Cron scheduler
│   ├── types/
│   │   ├── next-auth.d.ts     # NextAuth type extensions
│   │   └── prisma.ts          # Prisma query types
│   └── env.js                 # Environment validation
├── docker-compose.yml         # Postgres + Redis
├── .env.example               # Environment template
├── package.json               # Dependencies and scripts
├── README.md                  # This file
├── ARCHITECTURE.md            # Detailed architecture docs
└── TESTING.md                 # Testing guide and conventions
```

**📖 For detailed explanations of each component and module, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

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

### Scheduler
- `POST /api/scheduler/tick` - Trigger scheduler (requires `x-scheduler-secret` header)

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

## Development

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
# Run unit / integration / component tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests (Playwright)
pnpm test:e2e
```

For full details on the testing strategy, tools, and conventions, see **[TESTING.md](./TESTING.md)**.

### Type Checking

```bash
pnpm tsc --noEmit
```

### Linting

```bash
pnpm lint
```

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

1. **Read the documentation**: Check out [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
2. **Fork the repository**
3. **Create a feature branch**: `git checkout -b feature/amazing-feature`
4. **Make your changes**: Follow the code style and patterns in the codebase
5. **Test your changes**: Run `pnpm test` and ensure all tests pass
6. **Run linting**: `pnpm lint`
7. **Submit a pull request**: Include a clear description of your changes

### For New Contributors

- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed implementation patterns
- Start with small changes to get familiar with the codebase
- Ask questions by opening an issue

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
