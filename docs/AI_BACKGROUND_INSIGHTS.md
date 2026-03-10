# AI Background Insights

This document covers two background-generated AI features that extend the core AI Analysis
capability: **Pattern Insights** (cross-run regression pattern analysis) and **Site Health
Reports** (first-run comprehensive analysis). Both are generated automatically by the worker,
cached in the database, and gated by feature flags.

---

## Overview

| Feature | Trigger | Gated by | Output stored on |
|---------|---------|----------|-----------------|
| Pattern Insights | After every run where the monitor has ≥ 3 regressions in the last 90 days | `FEATURE_FLAGS.PATTERN_INSIGHT` | `MonitorInsight` table |
| Site Health Report | First successful run of a new monitor (fires exactly once) | `FEATURE_FLAGS.HEALTH_REPORT` | `Run.healthReport` |

Both features use **GPT-4o-mini** via the Vercel AI SDK (`generateText` — not streamed, since
there is no HTTP client waiting for the response). They are invoked fire-and-forget from
`src/worker/processor.ts` after regression detection completes.

---

## Feature 1: Pattern Insights

### What it does

After a monitor accumulates three or more regression alerts within a 90-day window, the
worker generates a cross-run analysis that identifies:

- The dominant recurring root cause across all incidents
- How frequently each cause appears
- One concrete, actionable recommendation to address the pattern

The insight is displayed as an amber card on the site detail page, below the metrics chart
for the relevant monitor.

### Data flow

```
processAuditJob completes regression detection
  → fire-and-forget IIFE checks: totalAlertCount >= 3 AND feature flag enabled
      → generatePatternInsight(monitorId, userId)
          → checkRateLimit (5 generations/user/day)
          → redis.set lock:pattern-insight:{monitorId} NX EX 120   # prevent concurrent runs
          → prisma.regressionAlert.findMany (last 90 days for monitor)
          → computeInputHash(alerts)   # SHA-256 of sorted alert IDs + likelyCauses
          → check MonitorInsight for fresh cached insight with matching hash
          → if stale or missing: buildPatternAnalysisPrompt(alerts, siteName, siteUrl)
              → generateText(openai("gpt-4o-mini"), prompt)
              → parseDominantCause(text)   # extracts <!-- DOMINANT_CAUSE: id -->
              → parseRecommendation(text)  # extracts ### Recommendation section
              → prisma.monitorInsight.upsert
```

On the site detail page:
```
GET /api/monitors/[id]/pattern-insights
  → resolveUser + ownership check
  → isFeatureEnabled(PATTERN_INSIGHT) → 403 if disabled
  → checkRateLimit (30 reads/user/day)
  → prisma.monitorInsight.findMany
  → if stale (> 24h) or missing: trigger background regeneration (fire-and-forget)
  → return { insights, isGenerating }
```

### Cache invalidation

The `MonitorInsight` record stores an `inputHash` — a SHA-256 digest of the sorted alert IDs
and their `likelyCauses` JSON. Regeneration is triggered when:

1. No cached insight exists for the monitor, **or**
2. The input hash has changed (new regressions or updated root cause data), **or**
3. The cached insight is older than 24 hours

This avoids regenerating when data is unchanged (e.g., scheduled polling with no new
regressions), while still refreshing when the underlying pattern evolves.

### Prompt structure

Built by `buildPatternAnalysisPrompt(alerts, siteName, siteUrl)` in `src/lib/ai/prompt-builder.ts`.

The prompt includes:
1. System context (senior web performance engineer role, site name, URL)
2. **Regression Timeline** — date, metric, severity, % change for each alert
3. **Root Cause Frequency** — cause title + how many alerts it appeared in
4. **Affected Metrics** — per-metric regression count

The requested output format (Markdown) is exactly four sections:
1. **Pattern Summary** — 2-3 sentences on the overall pattern and business impact
2. **Recurrence Analysis** — why the pattern keeps reoccurring
3. **Root Cause** — dominant technical cause with evidence
4. **Recommendation** — one concrete actionable fix

A machine-readable footer is also requested: `<!-- DOMINANT_CAUSE: rule-id -->`. This is
parsed by `parseDominantCause()` to populate the `dominantCause` DB column without a
second LLM call.

---

## Feature 2: Site Health Report

### What it does

When a monitor completes its first-ever successful run, the worker generates a comprehensive
initial analysis of the site's performance posture. This is richer than the standard AI
summary — it includes all audits and insights (not just the top 10/5), extra metrics, and
produces five structured sections designed for both engineers and stakeholders.

The report is displayed as a primary-themed card on the run detail page with an "Initial
Site Analysis" header and a "First Run" badge. It is shown instead of (and above) any
subsequent on-demand AI summary for that run.

### First-run detection

The worker detects the first run by counting prior **successful** runs for the monitor
(excluding the current run):

```typescript
const previousSuccessCount = await prisma.run.count({
  where: { monitorId, status: RunStatus.success, id: { not: runId } },
});
```

If `previousSuccessCount === 0`, the run is flagged with `isFirstRun: true` before
`generateHealthReport` is called. This flag is durable — retried jobs will be caught by the
`if (run.healthReport) return` idempotency guard inside `generateHealthReport` and will
not regenerate.

### Data flow

```
processAuditJob completes (status = success, first run)
  → fire-and-forget IIFE checks: previousSuccessCount === 0
      → prisma.run.update({ isFirstRun: true })
      → generateHealthReport(runId, userId)
          → isFeatureEnabled(HEALTH_REPORT, userId, { defaultValue: false })
          → checkRateLimit (5 reports/user/day)
          → prisma.run.findUnique (with audits, insights, regressionAlerts)
          → idempotency guard: if run.healthReport already set, return
          → buildHealthReportPrompt(run)
              → generateText(openai("gpt-4o-mini"), prompt)
              → prisma.run.update({ healthReport, healthReportAt, healthReportModel })
```

### Prompt structure

Built by `buildHealthReportPrompt(run)` in `src/lib/ai/prompt-builder.ts`.

The prompt includes:
1. System context (initial health assessment framing, site name, URL, strategy)
2. **Performance Scores** — with Good / Needs Improvement / Poor labels
3. **Core Web Vitals** — LCP, INP, TBT, CLS, FCP, TTFB
4. **Additional Metrics** — Speed Index, TTI, total byte weight, request count, main thread
   work (when available)
5. **Improvement Opportunities** — all insights sorted by metric savings, capped at 20
6. **Failed / Warning Audits** — all scored failures, capped at 30

The requested output format (Markdown) is exactly five sections:
1. **Executive Assessment** — 3-4 sentences on maturity, critical issue, and primary strength
2. **Quick Wins (Effort vs Impact)** — top 3 low-effort improvements with metric estimates
3. **Risk Areas** — 2-3 metrics near "Needs Improvement" threshold
4. **Monitoring Strategy** — whether to add desktop monitoring, recommended cadence
5. **Performance Maturity** — score 1-5 with rationale referencing specific metrics

---

## Shared Infrastructure

### Rate limiting (three layers)

Both features share the same `checkRateLimit` utility from `src/lib/rate-limit.ts`.

| Layer | Pattern Insights | Health Report |
|-------|-----------------|---------------|
| **API reads** | 30 calls/user/day (`pattern-insight` key) | n/a (worker only) |
| **LLM generation** | 5 calls/user/day (`pattern-insight-gen` key) | 5 calls/user/day (`health-report` key) |
| **Concurrency lock** | Redis `SETNX` lock per monitor (120s TTL) | Idempotency flag (`isFirstRun` + `run.healthReport`) |

### Feature flag defaults

The worker uses `defaultValue: false` for both flags — generation is opt-in and will not
fire in local development or staging unless explicitly enabled in PostHog. UI rendering of
**already-stored** reports defaults to `true`, so previously generated content remains
visible even if the flag is rolled back.

| Context | `defaultValue` | Rationale |
|---------|---------------|-----------|
| Worker (generation) | `false` | Cost-bearing operation — opt-in |
| API route / page (display) | `true` | Display is free — show stored data |

### Prompt injection protection

All user-supplied and externally-derived strings are passed through `sanitizeForPrompt()`
before interpolation into prompts. This strips common injection trigger phrases
(`ignore previous instructions`, `disregard all prior`, etc.) and enforces a character
limit. Applied to: `siteName`, `siteUrl`, and all `insight.sources[].url` values across
all three prompt builders.

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/ai/constants.ts` | `PATTERN_INSIGHT` and `HEALTH_REPORT` constant objects (model, limits, Redis keys) |
| `src/lib/ai/prompt-builder.ts` | `buildPatternAnalysisPrompt`, `buildHealthReportPrompt`, `sanitizeForPrompt` |
| `src/lib/ai/pattern-insight.ts` | `generatePatternInsight(monitorId, userId)` — rate-limited, hash-cached, Redis-locked |
| `src/lib/ai/health-report.ts` | `generateHealthReport(runId, userId)` — feature-flagged, idempotent, rate-limited |
| `src/app/api/monitors/[id]/pattern-insights/route.ts` | GET endpoint — auth, ownership check, stale-while-revalidate |
| `src/worker/processor.ts` | Two fire-and-forget IIFEs after notification dispatch |
| `src/components/pattern-insight-card.tsx` | Amber card for one pattern insight |
| `src/components/pattern-insights-section.tsx` | Async server component — fetches and renders insights |
| `src/components/run-health-report.tsx` | Primary-themed card for first-run health report |
| `src/app/(app)/sites/[id]/page.tsx` | Renders `<PatternInsightsSection>` per monitor inside `<Suspense>` |
| `src/app/(app)/runs/[id]/page.tsx` | Renders `<RunHealthReport>` when `isFirstRun && healthReport` |

---

## Database Schema

### `MonitorInsight` (new table)

```prisma
model MonitorInsight {
  id              String   @id @default(cuid())
  monitorId       String
  metricName      String?  // null = cross-metric; "lcp" etc. = single-metric
  generatedAt     DateTime @default(now())
  summary         String   @db.Text
  recurrenceCount Int
  dominantCause   String
  recommendation  String   @db.Text
  model           String
  inputHash       String   // SHA-256 of sorted alertIds + likelyCauses JSON

  monitor Monitor @relation(fields: [monitorId], references: [id], onDelete: Cascade)
}
```

Two partial unique indexes are applied via raw SQL in the migration (Prisma does not support
partial indexes natively):

```sql
-- Only one cross-metric insight per monitor at a time
CREATE UNIQUE INDEX "MonitorInsight_monitorId_crossMetric_key"
  ON "MonitorInsight"("monitorId") WHERE "metricName" IS NULL;

-- Only one per-metric insight per monitor per metric
CREATE UNIQUE INDEX "MonitorInsight_monitorId_metricName_key"
  ON "MonitorInsight"("monitorId", "metricName") WHERE "metricName" IS NOT NULL;
```

### New fields on `Run`

```prisma
isFirstRun        Boolean   @default(false)  // Set by worker on first successful run
healthReport      String?   @db.Text         // Generated Markdown report
healthReportAt    DateTime?                  // When the report was generated
healthReportModel String?                    // Model used (e.g. "gpt-4o-mini")
```

Migration: `prisma/migrations/..._add_monitor_insight_and_health_report/`

---

## Environment Variable

Both features share the same key as the existing AI summary:

```env
OPENAI_API_KEY=sk-...
```

No additional environment variables are required.

---

## Architecture Decisions

**Why `generateText` instead of `streamText`?**
Both features are background-generated — there is no HTTP client waiting for a stream.
`generateText` returns the full response as a string, which is simpler to parse and store.
`streamText` is reserved for the on-demand AI summary where the user is watching the
response in real time.

**Why fire-and-forget IIFEs instead of a new BullMQ queue?**
The pattern insight and health report are non-critical, low-frequency operations. Adding a
dedicated queue introduces operational overhead (dead-letter handling, queue monitoring)
without meaningful benefit. Both operations are idempotent: if a fire-and-forget IIFE fails,
the next eligible run retriggers the check. A dedicated queue would be warranted only if
retry guarantees or SLA tracking were required.

**Why cache invalidation via SHA-256 hash?**
Pure time-based TTL regenerates the insight every 24 hours even when the underlying data
hasn't changed, wasting LLM quota. Pure count-based invalidation misses cases where the
same number of regressions have different root causes. The hash approach regenerates
precisely when the input data changes, and no sooner.

**Why does the health report fire exactly once per monitor?**
The value of an initial analysis is highest at the moment a user first sees data for a
site. Subsequent runs have the on-demand AI summary for individual run analysis and pattern
insights for recurring trend analysis. Generating a new health report on every run would
provide redundant value at unnecessary cost.

**Why `defaultValue: false` in the worker?**
Worker-side generation calls the OpenAI API and incurs cost. Defaulting to `false` means
the feature only activates when explicitly enabled in PostHog — zero accidental cost during
local development or when the PostHog env vars are not configured. UI display of already-
stored reports defaults to `true` because rendering is free and hiding stored data would be
confusing.

**Why a separate `MonitorInsight` table instead of a JSON column on `Monitor`?**
The table allows querying by `generatedAt` and `monitorId` for staleness checks without
fetching the full record. It also supports future per-metric insights as separate rows via
the nullable `metricName` column. A JSON blob on `Monitor` would require a full record
fetch and client-side parsing for every staleness check.

---

## Local Development

Both features are disabled by default when PostHog is not configured (`defaultValue: false`
in the worker). To test them locally:

**Option A — enable via PostHog (recommended for full flow testing):**
1. Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` in `.env.local`
2. Enable `pattern_insight` and/or `health_report` flags in your dev PostHog project
3. `pnpm dev:all`

**Option B — force-enable for a quick smoke test:**

In `src/lib/ai/pattern-insight.ts` and `src/lib/ai/health-report.ts`, temporarily change
the `isFeatureEnabled` call's `defaultValue` to `true`. Revert before committing.

**Seeding regressions for pattern insight testing:**
```bash
pnpm seed:regressions your@email.com "Test Site" 5
```
This creates 5 alerts on a monitor. The next successful run will trigger pattern insight
generation.
