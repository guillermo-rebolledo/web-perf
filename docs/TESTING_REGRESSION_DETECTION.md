# Testing Regression Detection - Complete Guide

This guide walks you through testing the regression detection feature using the seed script.

## 📋 Prerequisites

- Database running (Postgres)
- App running: `pnpm dev:all`
- You're signed in to the app with a user account

## 🔍 Database Impact Assessment

### Will the seed script affect my existing data?

**Short answer: No, it creates separate test data.**

The seed script:
- ✅ Creates a **separate test user** (`test@example.com`)
- ✅ Creates a **separate test site** ("Test Site (with regressions)")
- ✅ Creates a **separate monitor** and runs
- ❌ **Does NOT modify** your existing sites, monitors, or runs
- ❌ **Does NOT delete** any existing data

### What if I already have `test@example.com`?

If you already have a user with that email, the script will:
- Reuse that user (via `upsert`)
- Create a new site under that user
- **Still safe** - won't break anything

## 🚀 Quick Start (Recommended)

### Option A: Use Separate Test User (Easiest)

**Step 1: Run the seed script**

```bash
pnpm seed:regressions
```

You should see output like:
```
🌱 Seeding regression test data...

Creating test user...
✅ User created: test@example.com

Creating test site...
✅ Site created: Test Site (with regressions)

Creating test monitor...
✅ Monitor created: mobile

Creating 30 baseline runs...
✅ Created 30 baseline runs

Calculating baselines...
✅ Baselines calculated for 6 metrics:
   - lcp: 2100.45 (n=30)
   - tbt: 275.23 (n=30)
   - cls: 0.09 (n=30)
   - inp: 200.15 (n=30)
   - fcp: 1575.80 (n=30)
   - ttfb: 550.40 (n=30)

Creating regressed runs...

Creating Regression 1: LCP regression...
   Detected 1 regression(s)
   ✅ LCP: critical (low confidence)
      Top cause: Third-Party Scripts Added or Increased (85% confidence)

Creating Regression 2: TBT regression...
   Detected 1 regression(s)
   ✅ TBT: critical (low confidence)
      Top cause: Main Thread Contention Increased (65% confidence)

Creating Regression 3: CLS regression...
   Detected 1 regression(s)
   ✅ CLS: critical (low confidence)
      Top cause: Layout Shifts Increased (80% confidence)

============================================================
✅ Seed completed successfully!

Total regression alerts created: 3
```

**Step 2: Configure auth for test user**

Since the test user `test@example.com` doesn't exist in your auth provider, you have two options:

**Option 2A: Add test email to your auth provider**
- If using GitHub OAuth: Can't easily do this
- If using email magic link: Configure your email provider to allow test@example.com
- **Not recommended** - easier to use Option 2B

**Option 2B: Modify script to use YOUR email** (Recommended)

```bash
# Edit the seed script
code prisma/seed-regressions.ts
```

Change line ~23:
```typescript
// FROM:
where: { email: "test@example.com" },

// TO:
where: { email: "your-actual-email@example.com" }, // Use your real email!
```

Then re-run:
```bash
pnpm seed:regressions
```

**Step 3: View in UI**

1. Navigate to http://localhost:3000
2. You should see "Test Site (with regressions)" in your sites list
3. Click on the site
4. Click on any of the **last 3 runs** (most recent)
5. Scroll down past "Core Web Vitals" section
6. You'll see the **red regression alert section**! 🎉

## 📊 Testing Each Regression Scenario

### Scenario 1: LCP Regression (Third-Party Script)

**What to look for:**

1. **Run Details Page**:
   - Red "Performance Regressions Detected" banner
   - LCP metric card shows ~3200ms (regressed from ~2100ms baseline)
   - Alert card shows:
     - Severity: **Critical** (>50% regression)
     - Confidence: **Low** (first occurrence)
     - Metric change: `2100ms → 3200ms (+52%)`
     - Top cause preview: "Third-Party Scripts Added or Increased"

2. **Click "View Root Cause Analysis"**:
   - Header shows full delta: +1100ms (+52%)
   - **Root Cause #1** (Top ranked):
     - Title: "Third-Party Scripts Added or Increased"
     - Confidence: **85% (High)**
     - Evidence table shows:
       - New Domain: `analytics.newdomain.com`
       - Third-Party Bytes: `+210 KB`
       - Blocking time: `420ms`
     - Recommendations:
       - "Load third-party scripts asynchronously with async/defer"
       - "Consider self-hosting critical resources"
       - etc.

3. **Performance Changes Section**:
   - **Network card**:
     - Total Bytes: `+500 KB`
     - Requests: `+15`
     - JavaScript: `+210 KB`
     - New Domains: `analytics.newdomain.com`
   - **Main Thread card**:
     - Total Work: `+800ms`
     - Scripting Time: increased
   - **Backend card**:
     - TTFB: minimal change

**What this tests:**
- ✅ Threshold detection (LCP >15% AND >300ms)
- ✅ Severity classification (critical >50%)
- ✅ Third-party rule firing with high confidence
- ✅ Network diff calculation
- ✅ Evidence extraction from insights

---

### Scenario 2: TBT Regression (Main Thread Contention)

**What to look for:**

1. **Run Details Page**:
   - TBT metric card shows ~450ms (regressed from ~275ms baseline)
   - Alert card shows:
     - Severity: **Critical** (+64%)
     - Confidence: **Low**
     - Top cause: "Main Thread Contention Increased"

2. **Root Cause Analysis Page**:
   - **Root Cause #1**:
     - Title: "Main Thread Contention Increased"
     - Confidence: **65% (Medium)**
     - Evidence:
       - Total Main Thread Work: `+1200ms`
       - Long Tasks Count: `+3`
       - TBT: `275ms → 450ms`
     - Main thread breakdown by category shown

3. **Performance Changes**:
   - **Main Thread card**:
     - Total Work: `+1200ms`
     - Long Tasks: `+3`
   - **Network card**: Minimal changes

**What this tests:**
- ✅ TBT threshold detection (>20% AND >100ms)
- ✅ Main thread rule firing
- ✅ Long task detection from insights
- ✅ Main thread diff calculation

---

### Scenario 3: CLS Regression (Layout Shifts)

**What to look for:**

1. **Run Details Page**:
   - CLS metric card shows ~0.18 (regressed from ~0.09 baseline)
   - Alert card shows:
     - Severity: **Critical** (+100%)
     - Confidence: **Low**
     - Top cause: "Layout Shifts Increased"

2. **Root Cause Analysis Page**:
   - **Root Cause #1**:
     - Title: "Layout Shifts Increased"
     - Confidence: **80% (High)**
     - Evidence:
       - CLS: `0.09 → 0.18 (+0.09)`
       - Elements Causing Shifts: `0 → 3`
       - Shift sources listed:
         - `div.ad-banner` (score: 0.08)
         - `img.lazy-loaded` (score: 0.05)
         - `div.dynamic-content` (score: 0.05)
     - Recommendations:
       - "Add explicit width/height attributes to images"
       - "Reserve space for ads with min-height"
       - etc.

3. **Performance Changes**:
   - **Rendering card**:
     - CLS shift sources changed: Yes
     - Shows new shift elements

**What this tests:**
- ✅ CLS threshold detection (>25% AND >0.05)
- ✅ CLS rule firing
- ✅ Layout shift element extraction
- ✅ Rendering diff calculation

---

## 🧪 Advanced Testing

### Test Confidence Scoring

The seed script creates only **first-occurrence regressions** (confidence: low). To test confidence progression:

**Manual approach:**

1. After running seed script, manually create 2 more runs with the same regression
2. Confidence should upgrade:
   - 1st occurrence: **Low**
   - 2nd consecutive: **Medium**
   - 3rd+ consecutive: **High**

**Code approach:**

Modify the seed script to create consecutive regressed runs:

```typescript
// After creating lcpRegression, create 2 more similar runs
for (let i = 0; i < 2; i++) {
  const consecutiveRun = await prisma.run.create({
    data: {
      // Same data as lcpRegression but different timestamp
      ...
      lcp: 3200, // Still regressed
    },
  });

  // Detect and create alert
  const regressions = await detectRegressions(consecutiveRun, prisma);
  // ... save alerts
}
```

### Test Multiple Regressions in Single Run

Modify a run to have multiple metrics regressed:

```typescript
const multiRegression = await prisma.run.create({
  data: {
    lcp: 3200, // Regressed
    tbt: 450,  // Regressed
    cls: 0.18, // Regressed
    // Should detect 3 separate regressions!
  },
});
```

### Test Edge Cases

1. **No baseline**: Create a monitor with only 3 runs (< MIN_SAMPLE_SIZE)
   - Expected: No regression detection (needs 5+ runs)

2. **Null metrics**: Create a run with `lcp: null`
   - Expected: That metric skipped, others still detected

3. **Below threshold**: Create run with LCP=2200ms (+5% from baseline)
   - Expected: No regression (needs >15% AND >300ms)

---

## 🧹 Clean Up Test Data

### Option 1: Delete Just the Test Site

```bash
# Using psql
psql $DATABASE_URL -c "DELETE FROM \"Site\" WHERE id = 'test-site-with-regressions';"

# This cascades and deletes:
# - Monitor
# - All runs
# - All audits, insights, regression alerts
```

### Option 2: Delete Test User (if you created one)

```bash
psql $DATABASE_URL -c "DELETE FROM \"User\" WHERE email = 'test@example.com';"

# Cascades to all sites, monitors, runs, etc. owned by this user
```

### Option 3: Re-run Seed Script

The script is **idempotent** - running it again will:
- Upsert user/site/monitor (reuse existing)
- Create fresh runs (new IDs, doesn't delete old ones)

If you want a completely fresh start:
```bash
# Delete test site first
psql $DATABASE_URL -c "DELETE FROM \"Site\" WHERE id = 'test-site-with-regressions';"

# Then re-run seed
pnpm seed:regressions
```

---

## 📸 Expected Screenshots

### Run Details Page with Regression
```
┌─────────────────────────────────────────────────────┐
│ Run Details                                         │
├─────────────────────────────────────────────────────┤
│ [Performance Scores...]                             │
│ [Core Web Vitals Cards...]                          │
├─────────────────────────────────────────────────────┤
│ ⚠️  Performance Regressions Detected (1)            │
│                                                     │
│ ┌──────────────────────────────────────────────┐  │
│ │ ⚠️ LCP Regression                             │  │
│ │ [Critical] [High Confidence]                 │  │
│ │                                              │  │
│ │ Baseline: 2100ms                             │  │
│ │ Current:  3200ms                             │  │
│ │ Change:   +1100ms (+52%)                     │  │
│ │                                              │  │
│ │ Likely Cause:                                │  │
│ │ Third-Party Scripts Added or Increased       │  │
│ │                                              │  │
│ │ [View Root Cause Analysis →]                 │  │
│ └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Regression Details Page
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  LCP Regression Detected                         │
│ [Critical] [High Confidence]                        │
├─────────────────────────────────────────────────────┤
│ Baseline: 2100ms | Current: 3200ms | +1100ms       │
├─────────────────────────────────────────────────────┤
│ Root Cause Analysis                                 │
│                                                     │
│ 1️⃣ Third-Party Scripts Added (85% confidence)      │
│    Evidence:                                        │
│    • New Domain: analytics.newdomain.com            │
│    • Third-Party Bytes: +210 KB                     │
│    • Blocking Time: 420ms                           │
│    Recommendations:                                 │
│    • Load scripts asynchronously...                 │
│                                                     │
│ 2️⃣ JavaScript Bundle Size Increased (70%)          │
│    Evidence:                                        │
│    • JS Bytes: +210 KB                              │
│    • Scripting Time: +450ms                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Performance Changes                                 │
│                                                     │
│ Network:              Main Thread:                  │
│ • Bytes: +500 KB      • Work: +800ms                │
│ • Requests: +15       • Long Tasks: +3              │
│ • New: analytics...                                 │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

Use this checklist to verify all features work:

### Detection & Analysis
- [ ] Baselines calculated (check DB: `SELECT * FROM "RegressionBaseline"`)
- [ ] LCP regression detected (critical severity)
- [ ] TBT regression detected (critical severity)
- [ ] CLS regression detected (critical severity)
- [ ] Alerts saved with `likelyCauses` populated
- [ ] Alerts saved with `diffSummary` populated

### UI Components
- [ ] Run details page shows red regression section
- [ ] RegressionAlertCard displays correctly
  - [ ] Severity badge (red/orange/yellow)
  - [ ] Confidence badge (green/yellow/gray)
  - [ ] Metric delta displayed
  - [ ] Top cause preview shown
- [ ] "View Root Cause Analysis" link works

### Regression Details Page
- [ ] Header shows metric, severity, confidence
- [ ] Delta visualization works (baseline → current → change)
- [ ] Root cause panel shows top 3 causes
- [ ] Causes ranked correctly (highest confidence first)
- [ ] Evidence tables display before/after/delta
- [ ] Recommendations list shown
- [ ] Performance changes cards display
  - [ ] Network card (bytes, requests, domains)
  - [ ] Main Thread card (work, long tasks)
  - [ ] Rendering card (LCP resource, CLS)
  - [ ] Backend card (TTFB, latency)

### Rules Engine
- [ ] Third-party rule fires for LCP regression
- [ ] Main thread rule fires for TBT regression
- [ ] CLS rule fires for layout shift regression
- [ ] Evidence extracted correctly from insights
- [ ] Confidence scoring accurate (high 80-100, medium 60-79, low <60)

### Data Integrity
- [ ] No duplicate alerts created
- [ ] Baselines updated after seed
- [ ] Foreign keys intact
- [ ] JSON fields valid (can parse likelyCauses/diffSummary)

---

## 🐛 Troubleshooting

### "No regressions shown in UI"

**Check:**
1. Did seed script complete successfully? (check console output)
2. Are you viewing the correct site? (should be "Test Site (with regressions)")
3. Are you looking at the last 3 runs? (not older baseline runs)
4. Did you sign in with the correct email?

**Debug:**
```sql
-- Check if alerts exist
SELECT * FROM "RegressionAlert" LIMIT 5;

-- Check if baselines exist
SELECT * FROM "RegressionBaseline";

-- Check run with regression
SELECT r.id, r.lcp, r.tbt, r.cls, COUNT(ra.id) as alert_count
FROM "Run" r
LEFT JOIN "RegressionAlert" ra ON ra."runId" = r.id
GROUP BY r.id
ORDER BY r."completedAt" DESC
LIMIT 5;
```

### "User authentication issues"

**Solution:** Modify seed script to use your actual email (see Step 2 above)

### "Seed script fails"

**Common issues:**
- Database not running: Start Postgres
- Connection error: Check `DATABASE_URL` in `.env`
- Migration not applied: Run `pnpm prisma migrate deploy`

**Debug:**
```bash
# Check DB connection
psql $DATABASE_URL -c "SELECT 1;"

# Check migrations
pnpm prisma migrate status
```

### "UI shows alerts but no causes"

**Check:**
1. Is `likelyCauses` field populated in DB?
```sql
SELECT "metricName", "likelyCauses"
FROM "RegressionAlert"
WHERE "likelyCauses" IS NOT NULL
LIMIT 1;
```

2. Are insights created for the run?
```sql
SELECT COUNT(*) FROM "Insight"
WHERE "runId" = (
  SELECT "runId" FROM "RegressionAlert" LIMIT 1
);
```

If insights missing, the rules can't extract evidence.

---

## 🎓 Next Steps

After testing:
1. **Run your own monitors** and wait for real regressions
2. **Adjust thresholds** if needed (see `docs/REGRESSION_DETECTION.md`)
3. **Add more rules** for your specific use cases
4. **Configure alerting** (future enhancement - email/Slack)
5. **Integrate with CI/CD** (future enhancement - deployment correlation)

---

## 📚 Related Documentation

- `docs/REGRESSION_DETECTION.md` - Complete feature documentation
- `src/lib/regression/` - Core regression detection code
- `src/lib/regression/rules/` - Individual rule implementations
- `src/lib/regression/__tests__/` - Unit tests

---

**Happy Testing! 🚀**

Questions? Check the troubleshooting section or review the code in `src/lib/regression/`.
