# Database Scripts Guide

This guide covers the database utility scripts available for development and testing.

## Overview

The project includes several utility scripts to help you manage test data:

| Script | npm alias | Purpose |
|---|---|---|
| `prisma/seed-regressions.ts` | `pnpm seed:regressions` | Baseline + regressed runs with regression alerts |
| `prisma/seed-decline.ts` | `pnpm seed:decline` | Runs that gradually decline over time (for Run History) |
| `prisma/seed-improvement.ts` | `pnpm seed:improvement` | Runs that gradually improve over time (for Run History) |
| `prisma/seed-failed-runs.ts` | `pnpm seed:failed-runs` | Failed, running, and queued run states |
| `prisma/clean-db.ts` | `pnpm seed:clean` | Cleans all performance data while preserving user sessions |

> **Run History seed scripts** (`seed-decline` / `seed-improvement`) are documented in detail in **[docs/RUN-HISTORY.md](./docs/RUN-HISTORY.md)**.

## Scripts

### 🌱 Seed Script: `seed-regressions.ts`

Creates comprehensive test data including baseline runs, regressed runs, and regression alerts distributed across different time periods.

#### What it Creates

- **1 Test User** - A user account for testing (customizable)
- **1 Test Site** - A monitored website
- **1 Test Monitor** - Performance monitoring configuration
- **30 Baseline Runs** - Stable performance metrics over 30 days
- **8 Regressed Runs** - Distributed across different time periods:
  - **Recent (< 1 day)**: 3 alerts (LCP, TBT, CLS regressions)
  - **2 days ago**: FCP regression (image optimization issue)
  - **3 days ago**: Speed Index regression (rendering delay)
  - **5 days ago**: TTFB regression (backend slowdown)
  - **10 days ago**: INP regression (interaction delay)
  - **30 days ago**: Multi-metric regression (deployment issue)

#### Regression Types

| Time Period | Regression Type | Metrics Affected | Severity |
|-------------|----------------|------------------|----------|
| 2 hours ago | LCP Regression | LCP: +60% | Critical |
| 1 hour ago | TBT Regression | TBT: +80% | Critical |
| Just now | CLS Regression | CLS: +100% | Critical |
| 2 days ago | Image Optimization | FCP: +40% | Moderate |
| 3 days ago | Rendering Delay | Speed Index: +37% | Moderate |
| 5 days ago | Backend Slowdown | TTFB: +80% | Critical |
| 10 days ago | Interaction Delay | INP: +94% | Critical |
| 30 days ago | Multi-Metric | LCP: +67%, TBT: +68%, CLS: +67% | Critical |

#### Usage

```bash
# Basic usage with just email
pnpm tsx prisma/seed-regressions.ts your-email@example.com

# With custom name
pnpm tsx prisma/seed-regressions.ts your-email@example.com "Your Name"
```

**Arguments:**
- `email` (required) - Your email address that matches your login
- `name` (optional) - Display name (defaults to "Test User")

**Important:** Use the same email address you use to sign in to the application.

#### Example

```bash
pnpm tsx prisma/seed-regressions.ts developer@company.com "Jane Developer"
```

#### Expected Output

```
🌱 Seeding regression test data...

Creating test user...
✅ User created: developer@company.com

Creating test site...
✅ Site created: Test Site (with regressions)

Creating test monitor...
✅ Monitor created: mobile

Creating 30 baseline runs...
✅ Created 30 baseline runs

Calculating baselines...
✅ Baselines calculated for 6 metrics:
   - lcp: 2100.00 (n=30)
   - inp: 200.00 (n=30)
   - tbt: 275.00 (n=30)
   - cls: 0.09 (n=30)
   - fcp: 1575.00 (n=30)
   - ttfb: 550.00 (n=30)

Creating Regression 1: LCP regression...
   Detected 1 regression(s)
   ✅ LCP: critical (high confidence)
      Top cause: Third-party JavaScript blocking main thread (85% confidence)

... (more regressions)

Total regression alerts created: 8+

Alerts by time period:
   - Last 1 day:   3 alerts
   - Last 3 days:  5 alerts
   - Last 5 days:  6 alerts
   - Last 10 days: 7 alerts
   - Last 30 days: 8+ alerts

To view in UI:
   1. Sign in as: developer@company.com
   2. Navigate to "Regression Alerts" in the sidebar
   3. Switch between time period tabs to see alerts
```

#### Verifying the Data

After running the seed script:

1. **Sign in** to the application with the email you configured
2. **Navigate to "Regression Alerts"** in the sidebar
3. **Switch between tabs** (1d, 3d, 5d, 10d, 30d) to see alerts distributed across time periods
4. **Click on any alert** to view detailed root cause analysis
5. **Visit the Dashboard** to see the test site with performance trends

---

### 🧹 Cleanup Script: `clean-db.ts`

Removes all performance monitoring data while preserving user accounts and active sessions.

#### What it Deletes

- ✅ Regression alerts
- ✅ Regression baselines
- ✅ Insights
- ✅ Audits
- ✅ Runs
- ✅ Monitors
- ✅ Sites

#### What it Preserves

- ✓ User accounts
- ✓ Active sessions (stay logged in!)
- ✓ Authentication accounts (OAuth providers)
- ✓ Verification tokens

#### Usage

```bash
pnpm tsx prisma/clean-db.ts
```

#### Expected Output

```
🧹 Cleaning database...

Deleting regression alerts...
✅ Deleted 6 regression alerts

Deleting regression baselines...
✅ Deleted 6 regression baselines

Deleting insights...
✅ Deleted 192 insights

Deleting audits...
✅ Deleted 0 audits

Deleting runs...
✅ Deleted 36 runs

Deleting monitors...
✅ Deleted 1 monitors

Deleting sites...
✅ Deleted 1 sites

============================================================
✅ Database cleaned successfully!

Preserved:
   ✓ User accounts
   ✓ Active sessions
   ✓ Authentication providers

You can now run the seed script to create fresh test data:
   pnpm tsx prisma/seed-regressions.ts

============================================================
```

---

## Common Workflows

### Fresh Start

Start from a completely clean slate with fresh test data:

```bash
# 1. Clean existing data
pnpm tsx prisma/clean-db.ts

# 2. Seed new test data with your email
pnpm tsx prisma/seed-regressions.ts your-email@example.com

# 3. Refresh browser - you're still logged in!
```

### Testing Regression Alerts

Test the regression alert feature with realistic data:

```bash
# 1. Seed regression test data with your email
pnpm tsx prisma/seed-regressions.ts your-email@example.com

# 2. Sign in with the same email
# 3. Navigate to "Regression Alerts"
# 4. Explore different time period tabs
# 5. Click on alerts to see root cause analysis
```

### Iterating on Features

When developing new features that require test data:

```bash
# Quick reset workflow
pnpm tsx prisma/clean-db.ts && pnpm tsx prisma/seed-regressions.ts your-email@example.com
```

---

## Troubleshooting

### Missing Email Argument

If you forget to provide an email:

```
❌ Error: Email argument is required

Usage:
  pnpm tsx prisma/seed-regressions.ts <email> [name]

Examples:
  pnpm tsx prisma/seed-regressions.ts user@example.com
  pnpm tsx prisma/seed-regressions.ts user@example.com "John Doe"
```

### Invalid Email Format

The script validates email format:

```
❌ Error: Invalid email format: invalid-email
```

Use a valid email address like `user@example.com`.

### No Alerts Showing in UI

Check that:

1. The seed script completed successfully (check the output)
2. You're signed in with the same email configured in the seed script
3. The alerts were created with proper timestamps (script output shows distribution)
4. You're refreshing the page after seeding

### Database Connection Errors

Ensure your PostgreSQL container is running:

```bash
docker-compose ps
docker-compose up -d postgres
```

### TypeScript Errors When Running Scripts

Generate Prisma client first:

```bash
pnpm prisma generate
pnpm tsx prisma/seed-regressions.ts
```

---

## Script Internals

### How Baselines Are Calculated

The seed script uses the same baseline calculation logic as production:

1. Takes the last 30 successful runs for a monitor
2. Calculates the median value for each metric (LCP, TBT, CLS, etc.)
3. Stores these baselines in the `RegressionBaseline` table
4. Uses these baselines to detect regressions in new runs

### How Regressions Are Detected

The regression detection algorithm:

1. Compares each metric against its baseline median
2. Calculates percentage change
3. Determines severity based on thresholds:
   - **Critical**: >50% regression
   - **Moderate**: 25-50% regression
   - **Minor**: 10-25% regression
4. Assigns confidence based on consecutive regressions

### Root Cause Analysis

Each regression alert includes:

- **Likely causes** ranked by confidence and impact
- **Evidence** from metrics, audits, and resource analysis
- **Recommendations** for fixing the issue
- **Diff summary** showing before/after changes

### Run Environment Metadata

Each run captures the test environment configuration provided by the PageSpeed Insights API:

- **browserUserAgent**: Browser/device user agent string used by Lighthouse
- **benchmarkIndex**: Performance benchmark score of the test environment
- **emulatedFormFactor**: Device type - "mobile" or "desktop"

These fields help identify the test environment context when analyzing performance results.

---

## Adding Custom Test Scenarios

You can extend `seed-regressions.ts` to add custom regression scenarios:

```typescript
// Add a new regression at a specific time
const customRegression = await prisma.run.create({
  data: {
    monitorId: monitor.id,
    status: "success",
    queuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 10000),

    // Set regressed metrics
    lcp: 4000, // Major regression
    // ... other metrics
  },
});

// Detect and create alerts
const customRun = await prisma.run.findUnique({
  where: { id: customRegression.id },
  include: { monitor: true },
});

if (customRun) {
  const regressions = await detectRegressions(customRun, prisma);
  // ... create alerts
}
```

---

## Related Documentation

- **[README.md](./README.md)** - Project overview and setup
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and patterns
- **[TESTING.md](./TESTING.md)** - Testing guide and conventions
- **[prisma/schema.prisma](./prisma/schema.prisma)** - Database schema
