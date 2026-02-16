# Web Performance Lab - Architecture Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Background Jobs & Workers](#background-jobs--workers)
8. [Authentication](#authentication)
9. [Key Data Flows](#key-data-flows)
10. [Development Workflow](#development-workflow)
11. [File Structure](#file-structure)

---

## Project Overview

Web Performance Lab is a production-ready application for monitoring website performance using Google's PageSpeed Insights API. It allows users to:

- Create and manage multiple sites
- Configure monitors for both mobile and desktop
- Schedule automated performance audits
- Trigger on-demand performance runs
- View historical performance trends
- Compare performance metrics between runs
- Track Core Web Vitals (LCP, INP, CLS, FCP, TTFB)

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
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
- **Authentication**: NextAuth.js v5 (Auth.js)

### Infrastructure
- **Containerization**: Docker Compose (PostgreSQL, Redis)
- **Email**: Nodemailer (magic links)
- **External API**: Google PageSpeed Insights API

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Frontend (React Server Components + Client)          │ │
│  │  • Pages (/dashboard, /sites/[id], /runs/[id])       │ │
│  │  • Components (Forms, Charts, Tables)                 │ │
│  │  • Authentication (NextAuth.js)                       │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Backend (API Routes)                                 │ │
│  │  • /api/sites                                         │ │
│  │  • /api/monitors                                      │ │
│  │  • /api/runs                                          │ │
│  │  • /api/auth/[...nextauth]                           │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
            ┌───────────────────────────────┐
            │       PostgreSQL Database      │
            │  • Users, Sites, Monitors     │
            │  • Runs, Audits               │
            │  • NextAuth Sessions          │
            └───────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Worker Process                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  BullMQ Worker                                        │ │
│  │  • Consumes audit jobs                                │ │
│  │  • Calls PageSpeed Insights API                       │ │
│  │  • Parses and stores results                          │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Scheduler (node-cron)                                │ │
│  │  • Checks for due monitors every minute               │ │
│  │  • Enqueues jobs for scheduled audits                 │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
                    ┌───────────────┐
                    │     Redis     │
                    │  • Job Queue  │
                    │  • Rate Limit │
                    └───────────────┘
                            │
                            ↓
                ┌───────────────────────┐
                │  PageSpeed Insights   │
                │  External API         │
                └───────────────────────┘
```

---

## Frontend Architecture

### Directory Structure

```
src/app/
├── layout.tsx              # Root layout with auth provider
├── page.tsx                # Home (redirects to dashboard)
├── globals.css             # Global styles and Tailwind config
├── dashboard/
│   └── page.tsx            # Sites list and overview
├── sites/[id]/
│   └── page.tsx            # Site detail with monitors and chart
├── runs/[id]/
│   ├── page.tsx            # Run details with metrics
│   └── compare/[id2]/
│       └── page.tsx        # Compare two runs side-by-side
└── auth/
    ├── signin/page.tsx     # Email sign-in form
    ├── verify-request/page.tsx
    └── error/page.tsx
```

### Key Patterns

#### 1. Server Components (Default)
All pages are React Server Components by default, enabling:
- Direct database access via Prisma
- Server-side authentication checks
- No client bundle overhead for static content

```typescript
// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  const session = await auth(); // Server-side auth check
  
  // Direct database query
  const sites = await prisma.site.findMany({
    where: { userId: session.user.id },
    include: { monitors: { include: { runs: true } } }
  });
  
  return <div>{/* Render sites */}</div>;
}
```

#### 2. Client Components (Selective)
Components are marked with `"use client"` only when needed:
- Forms with user interaction
- Charts with animations
- Components using React hooks (useState, useEffect)

```typescript
// src/components/site-form.tsx
"use client";

export function SiteForm() {
  const [open, setOpen] = useState(false);
  // ... form logic
}
```

#### 3. Type Safety with Prisma
All database types are inferred from Prisma schema:

```typescript
// src/types/prisma.ts
import { Prisma } from "@prisma/client";

export type SiteWithMonitorsAndRuns = Prisma.SiteGetPayload<{
  include: {
    monitors: {
      include: {
        runs: { take: 1 }
      }
    }
  }
}>;
```

### Component Architecture

#### Reusable UI Components (`src/components/ui/`)
- Built with shadcn/ui (Radix UI + Tailwind)
- Fully accessible (ARIA compliant)
- Composable and themeable
- Examples: `Button`, `Card`, `Table`, `Dialog`, `Input`

#### Feature Components (`src/components/`)
- **Forms**: `SiteForm`, `MonitorForm` - Handle create/edit operations
- **Visualizations**: `MetricsChart` - Recharts-based performance trends
- **Actions**: `RunButton` - Trigger on-demand runs with rate limiting
- **Display**: `ScoreBadge`, `MetricBadge` - Color-coded performance indicators
- **Navigation**: `Navigation`, `SessionProvider` - Auth-aware UI

### State Management

**No external state library needed** - leveraging Next.js patterns:

1. **Server State**: Fetched in Server Components, passed as props
2. **URL State**: Search params for filters, pagination
3. **Local State**: React `useState` for UI-only state (modals, forms)
4. **Form State**: React Hook Form for complex form management

---

## Backend Architecture

### API Routes Structure

```
src/app/api/
├── auth/
│   └── [...nextauth]/route.ts    # NextAuth handlers
├── sites/
│   ├── route.ts                  # GET (list), POST (create)
│   └── [id]/route.ts             # GET, PUT, DELETE (by ID)
├── monitors/
│   ├── route.ts                  # GET (by siteId), POST (create)
│   └── [id]/
│       ├── route.ts              # PUT, DELETE
│       └── run/route.ts          # POST (trigger on-demand run)
├── runs/
│   ├── route.ts                  # GET (list with pagination)
│   └── [id]/
│       ├── route.ts              # GET (details)
│       └── compare/[id2]/route.ts # GET (comparison)
└── scheduler/
    └── tick/route.ts             # POST (internal scheduler trigger)
```

### API Patterns

#### 1. Authentication Middleware
All routes check authentication:

```typescript
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // ... handle request
}
```

#### 2. Authorization
Resources are scoped to the authenticated user:

```typescript
const site = await prisma.site.findFirst({
  where: {
    id: siteId,
    userId: session.user.id, // Ensures ownership
  },
});
```

#### 3. Input Validation
All inputs validated with Zod:

```typescript
const bodySchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

const body = bodySchema.parse(await request.json());
```

#### 4. Rate Limiting
On-demand runs are rate-limited per user:

```typescript
import { checkRateLimit } from "@/lib/rate-limit";

const allowed = await checkRateLimit(
  `manual-run:${session.user.id}`,
  5, // max requests
  60 // per 60 seconds
);

if (!allowed) {
  return Response.json(
    { error: "Rate limit exceeded" },
    { status: 429 }
  );
}
```

#### 5. Idempotency
Manual runs check for recent pending jobs:

```typescript
const existingRun = await prisma.run.findFirst({
  where: {
    monitorId,
    status: { in: ["queued", "running"] },
    queuedAt: { gte: new Date(Date.now() - 60000) }, // Last minute
  },
});

if (existingRun) {
  return Response.json({ run: existingRun }, { status: 200 });
}
```

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
  sites         Site[]
  accounts      Account[]
  sessions      Session[]
}
```

#### Site
```prisma
model Site {
  id        String   @id @default(cuid())
  name      String
  url       String   // Canonicalized URL
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  monitors  Monitor[]
}
```

#### Monitor
```prisma
model Monitor {
  id             String    @id @default(cuid())
  siteId         String
  cadenceMinutes Int       @default(1440)  // How often to run
  strategy       String    @default("mobile")  // "mobile" or "desktop"
  isActive       Boolean   @default(true)
  nextRunAt      DateTime  @default(now())
  lastRunAt      DateTime?
  site           Site      @relation(fields: [siteId], references: [id])
  runs           Run[]
}
```

#### Run
```prisma
model Run {
  id       String    @id @default(cuid())
  monitorId String
  status    String    @default("queued")  // "queued" | "running" | "success" | "failed"
  jobId     String?   @unique
  queuedAt  DateTime  @default(now())
  startedAt DateTime?
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
  
  monitor Monitor @relation(fields: [monitorId], references: [id])
  audits  Audit[]
}
```

#### Audit
```prisma
model Audit {
  id           String  @id @default(cuid())
  runId        String
  auditId      String  // PageSpeed audit identifier
  title        String
  score        Float?  // 0-1 scale
  displayValue String?
  numericValue Float?
  run          Run     @relation(fields: [runId], references: [id])
}
```

### Indexes

Critical indexes for performance:

```prisma
@@index([userId])                    // On Site
@@index([siteId])                    // On Monitor
@@index([isActive, nextRunAt])       // For scheduler queries
@@index([monitorId, completedAt])    // For run history
@@index([status])                    // For job status queries
```

---

## Background Jobs & Workers

### BullMQ Queue Architecture

#### Queue Setup (`src/lib/queue.ts`)

```typescript
import { Queue } from "bullmq";
import { redis } from "./redis";

export interface AuditJobData {
  runId: string;
  monitorId: string;
  url: string;
  strategy: "mobile" | "desktop";
}

export const performanceQueue = new Queue<AuditJobData>(
  "performance-audits",
  { connection: redis }
);
```

#### Worker Process (`src/worker/index.ts`)

The worker runs as a **separate Node.js process**:

```bash
pnpm run dev:worker  # Development
pnpm run start:worker  # Production
```

Key responsibilities:
1. **Job Processing**: Consumes jobs from the queue
2. **API Calls**: Fetches data from PageSpeed Insights
3. **Data Parsing**: Extracts metrics and audits
4. **Database Updates**: Stores results in Postgres

```typescript
import { Worker } from "bullmq";

const worker = new Worker<AuditJobData>(
  "performance-audits",
  async (job) => {
    await processAuditJob(job.data);
  },
  {
    connection: redis,
    concurrency: 5, // Process 5 jobs concurrently
  }
);
```

#### Job Processor (`src/worker/processor.ts`)

```typescript
export async function processAuditJob(data: AuditJobData) {
  // 1. Update run status to "running"
  await prisma.run.update({
    where: { id: data.runId },
    data: { status: "running", startedAt: new Date() },
  });
  
  try {
    // 2. Call PageSpeed Insights API
    const psiResponse = await fetchPageSpeedInsights(
      data.url,
      data.strategy
    );
    
    // 3. Parse response
    const metrics = parsePSIResponse(psiResponse);
    
    // 4. Store in database (transaction for atomicity)
    await prisma.$transaction([
      // Update run with scores and metrics
      prisma.run.update({
        where: { id: data.runId },
        data: {
          status: "success",
          completedAt: new Date(),
          performanceScore: metrics.scores.performance,
          // ... other metrics
        },
      }),
      // Create audit records
      prisma.audit.createMany({
        data: metrics.audits.map(audit => ({
          runId: data.runId,
          ...audit,
        })),
      }),
    ]);
    
    // 5. Update monitor's last run time
    await prisma.monitor.update({
      where: { id: data.monitorId },
      data: { lastRunAt: new Date() },
    });
  } catch (error) {
    // Update run status to "failed"
    await prisma.run.update({
      where: { id: data.runId },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error.message,
      },
    });
  }
}
```

### Scheduler (`src/worker/scheduler.ts`)

The scheduler runs **inside the worker process** using node-cron:

```typescript
import cron from "node-cron";

export function startScheduler() {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    await processDueMonitors();
  });
}

async function processDueMonitors() {
  // Find monitors that are due for a run
  const dueMonitors = await prisma.monitor.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: new Date() },
    },
    include: { site: true },
  });
  
  for (const monitor of dueMonitors) {
    // Create a new run record
    const run = await prisma.run.create({
      data: {
        monitorId: monitor.id,
        status: "queued",
      },
    });
    
    // Enqueue the job
    const job = await performanceQueue.add("audit", {
      runId: run.id,
      monitorId: monitor.id,
      url: monitor.site.url,
      strategy: monitor.strategy,
    });
    
    // Update run with job ID and schedule next run
    await prisma.run.update({
      where: { id: run.id },
      data: { jobId: job.id },
    });
    
    await prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        nextRunAt: new Date(Date.now() + monitor.cadenceMinutes * 60000),
      },
    });
  }
}
```

---

## Authentication

### NextAuth.js v5 Configuration

#### Setup (`src/lib/auth.ts`)

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

#### Authentication Flow

1. **User enters email** → `/auth/signin`
2. **Magic link sent** → Email with verification token
3. **User clicks link** → Token validated
4. **Session created** → JWT stored in cookie
5. **Protected routes** → Check `auth()` on every request

#### Usage in Server Components

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  
  // User is authenticated
  return <div>Welcome, {session.user.email}</div>;
}
```

#### Usage in API Routes

```typescript
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Handle authenticated request
}
```

---

## Key Data Flows

### 1. Manual Run Trigger Flow

```
User clicks "Run Now" button
    ↓
POST /api/monitors/[id]/run
    ↓
1. Check authentication
2. Check rate limit (5 per minute)
3. Check for existing pending run (idempotency)
4. Create Run record (status: "queued")
5. Enqueue BullMQ job
6. Return run ID to client
    ↓
Worker picks up job
    ↓
1. Update run status to "running"
2. Call PageSpeed Insights API
3. Parse response
4. Save metrics + audits (transaction)
5. Update run status to "success"
    ↓
UI polls or refreshes
    ↓
GET /api/runs/[id]
    ↓
Display results with charts
```

### 2. Scheduled Run Flow

```
Scheduler cron runs (every minute)
    ↓
Query for due monitors:
  - isActive = true
  - nextRunAt <= now
    ↓
For each due monitor:
  1. Create Run record
  2. Enqueue job
  3. Update nextRunAt = now + cadenceMinutes
    ↓
Worker processes job (same as manual run)
```

### 3. Compare Runs Flow

```
User navigates to /runs/[id]
    ↓
Page fetches run + previous run
    ↓
User clicks "Compare with Previous"
    ↓
Navigate to /runs/[run1]/compare/[run2]
    ↓
Server fetches both runs with audits
    ↓
Server calculates deltas:
  - Score differences
  - Metric differences (LCP, CLS, etc.)
  - Audit score changes
  - Identifies regressions vs improvements
    ↓
Render side-by-side comparison tables
```

---

## Development Workflow

### Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd side

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 4. Start Docker services
docker-compose up -d

# 5. Run database migrations
pnpm prisma db push

# 6. Generate Prisma client
pnpm prisma generate

# 7. Start development servers
pnpm run dev:all  # Starts both Next.js and worker
```

### Development Commands

```bash
pnpm dev              # Next.js dev server only
pnpm dev:worker       # Worker process only
pnpm dev:all          # Both Next.js and worker

pnpm build            # Build Next.js app
pnpm build:worker     # Build worker (TypeScript)
pnpm start            # Start production Next.js
pnpm start:worker     # Start production worker

pnpm prisma studio    # Open database GUI
pnpm prisma db push   # Push schema changes
```

### Adding New Features

#### 1. New Database Model

```bash
# Edit prisma/schema.prisma
pnpm prisma db push
pnpm prisma generate
```

#### 2. New API Route

```typescript
// src/app/api/your-route/route.ts
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  // ... implementation
}
```

#### 3. New UI Component

```typescript
// src/components/your-component.tsx
"use client"; // If needed

export function YourComponent() {
  // ... implementation
}
```

#### 4. New Page

```typescript
// src/app/your-page/page.tsx
import { auth } from "@/lib/auth";

export default async function YourPage() {
  const session = await auth();
  // ... implementation
}
```

### Common Patterns

#### Type-Safe Database Queries

Always define types for complex includes:

```typescript
// src/types/prisma.ts
export type YourType = Prisma.ModelGetPayload<{
  include: { relations: true }
}>;
```

#### Error Handling

Use try-catch and return appropriate HTTP status codes:

```typescript
try {
  // ... operation
  return Response.json({ data }, { status: 200 });
} catch (error) {
  console.error("Operation failed:", error);
  return Response.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

#### URL Canonicalization

Always canonicalize URLs before storing:

```typescript
import { canonicalizeUrl } from "@/lib/url-utils";

const canonicalUrl = canonicalizeUrl(userInput);
```

---

## File Structure

```
side/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── globals.css         # Global styles
│   │   ├── api/                # API routes
│   │   │   ├── auth/
│   │   │   ├── sites/
│   │   │   ├── monitors/
│   │   │   ├── runs/
│   │   │   └── scheduler/
│   │   ├── dashboard/          # Dashboard page
│   │   ├── sites/[id]/         # Site detail page
│   │   ├── runs/[id]/          # Run detail page
│   │   └── auth/               # Auth pages
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── site-form.tsx
│   │   ├── monitor-form.tsx
│   │   ├── metrics-chart.tsx
│   │   ├── run-button.tsx
│   │   └── score-badge.tsx
│   ├── lib/                    # Utility libraries
│   │   ├── auth.ts             # NextAuth config
│   │   ├── prisma.ts           # Prisma client
│   │   ├── queue.ts            # BullMQ queue
│   │   ├── redis.ts            # Redis client
│   │   ├── rate-limit.ts       # Rate limiting
│   │   ├── psi-parser.ts       # PageSpeed parser
│   │   ├── url-utils.ts        # URL helpers
│   │   └── metrics-compare.ts  # Comparison logic
│   ├── types/                  # TypeScript types
│   │   ├── next-auth.d.ts      # NextAuth types
│   │   └── prisma.ts           # Prisma query types
│   └── worker/                 # Background worker
│       ├── index.ts            # Worker entry point
│       ├── processor.ts        # Job processor
│       └── scheduler.ts        # Cron scheduler
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
├── docker-compose.yml          # Docker services
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── next.config.ts              # Next.js config
├── tailwind.config.ts          # Tailwind config
├── components.json             # shadcn/ui config
├── .env.example                # Environment template
├── README.md                   # Getting started guide
└── ARCHITECTURE.md             # This file
```

---

## Best Practices & Guidelines

### Code Style

1. **TypeScript**: Always use strict typing, avoid `any`
2. **Async/Await**: Prefer over `.then()` chains
3. **Error Handling**: Always wrap external API calls in try-catch
4. **Comments**: Use comments for complex business logic
5. **Naming**: Use descriptive names (`fetchSiteById` not `getData`)

### Database

1. **Transactions**: Use for multiple related writes
2. **Indexes**: Add indexes for frequently queried fields
3. **Cascading Deletes**: Configured in schema for cleanup
4. **Soft Deletes**: Not implemented (use cascading instead)

### Security

1. **Authentication**: Check on every protected route
2. **Authorization**: Always filter by `userId`
3. **Input Validation**: Use Zod for all user inputs
4. **Rate Limiting**: Apply to expensive operations
5. **Environment Variables**: Never commit `.env` file

### Performance

1. **Server Components**: Use by default for better performance
2. **Pagination**: Implement for large lists
3. **Caching**: Redis caching for rate limits
4. **Indexes**: Monitor slow queries and add indexes
5. **Concurrent Jobs**: BullMQ processes 5 jobs at once

### Testing Strategy

While tests aren't currently implemented, here's the recommended approach:

1. **Unit Tests**: Utility functions (`url-utils`, `metrics-compare`)
2. **Integration Tests**: API routes with test database
3. **E2E Tests**: Critical user flows (Playwright)
4. **Manual Testing**: Performance monitoring in production

---

## Deployment Considerations

### Environment Variables

Required for production:

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<random-string>
EMAIL_SERVER=smtp://...
EMAIL_FROM=noreply@your-domain.com
GOOGLE_PAGESPEED_API_KEY=<your-key>
```

### Infrastructure Requirements

1. **Web Server**: Next.js app (Vercel, Railway, AWS, etc.)
2. **Worker Server**: Separate Node.js process
3. **PostgreSQL**: Managed instance (AWS RDS, Supabase, etc.)
4. **Redis**: Managed instance (Upstash, Redis Cloud, etc.)
5. **Email**: SMTP server (SendGrid, Mailgun, etc.)

### Scaling Considerations

1. **Horizontal Scaling**: Run multiple worker instances
2. **Database**: Connection pooling with Prisma
3. **Redis**: Cluster mode for high availability
4. **Job Concurrency**: Adjust based on API rate limits
5. **Monitoring**: Set up error tracking (Sentry, etc.)

---

## Troubleshooting

### Common Issues

1. **Email not sending**: Check `EMAIL_SERVER` credentials
2. **Worker not processing**: Verify Redis connection
3. **Rate limit errors**: Increase limits or add delay
4. **TypeScript errors**: Run `pnpm prisma generate`
5. **Database errors**: Check connection string and migrations

### Debugging

```bash
# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Check database
pnpm prisma studio

# Check Redis
redis-cli -h localhost -p 6379
KEYS *
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io)
- [NextAuth.js Documentation](https://authjs.dev)
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)

---

**Questions or Issues?**

For any questions about the architecture or implementation, please reach out to the team or open an issue in the repository.
