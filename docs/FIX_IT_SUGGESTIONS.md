# Fix-It Suggestions

This document covers the AI-generated code fix suggestions feature on regression alert detail pages.

---

## Overview

When a regression alert is detected, the app already identifies *what* regressed and *why* (root causes with ranked evidence). The Fix-It Suggestions feature closes the gap between diagnostics and remediation by generating specific, implementation-ready code fixes — HTML, JS, CSS, or config changes — tied directly to the audits and diffs that caused the regression.

Key characteristics:

- **User-triggered** — generated on demand, not automatically in the background
- **Streamed** to the browser in real time — no blank spinner waiting for the full response
- **Cached in the database** after the first generation — subsequent page loads show it instantly
- **Regenerable** after a 60-minute cooldown
- **Rate-limited** — 5 generations per user per day (separate quota from AI Run Summary)

---

## Data Flow

```
User clicks "Generate Fix Suggestions" on a regression alert detail page
  → POST /api/regressions/[alertId]/code-suggestions
      → auth() check (session only — UI feature)
      → prisma.regressionAlert.findUnique (with run.monitor.site and run.audits)
      → ownership check: alert.run.monitor.site.userId === session.user.id
      → isFeatureEnabled(FIX_IT_SUGGESTIONS) → 403 if disabled
      → per-alert cooldown check (60 min) → 429 if cooling down
      → checkRateLimit(userId, 5/day, "fix-it-suggestions") → 429 if daily limit hit
      → parseRegressionCauses(alert.likelyCauses) → RegressionCause[]
      → getRelevantAuditIds(causes.map(c => c.id)) → string[]
      → filter run.audits to relevant audit IDs
      → buildFixItSuggestionsPrompt(alert, causes, diffSummary, relevantAudits, site, strategy)
      → streamText({ model: openai("gpt-4o-mini"), prompt })
          onFinish → prisma.regressionAlert.update({
            fixItSuggestions, fixItSuggestionsAt, fixItSuggestionsModel
          })
      → toTextStreamResponse() → streamed back to client
  → useCompletion streams Markdown into the panel in real time
```

On next page load the server-rendered `cachedSuggestions` prop is already populated — no API call needed.

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/ai/constants.ts` | `FIX_IT_SUGGESTIONS` constant block: model, daily limit, cooldown, error codes |
| `src/lib/feature-flags.ts` | `FEATURE_FLAGS.FIX_IT_SUGGESTIONS` key |
| `src/lib/ai/prompt-builder.ts` | `buildFixItSuggestionsPrompt()`, `getRelevantAuditIds()`, `RULE_TO_AUDIT_IDS` map |
| `src/app/api/regressions/[alertId]/code-suggestions/route.ts` | POST handler: auth, rate limits, streaming, DB cache |
| `src/components/fix-it-suggestions-panel.tsx` | Client component: button, streaming display, markdown render |
| `src/app/(app)/runs/[id]/regressions/[alertId]/page.tsx` | Renders `<FixItSuggestionsPanel>` between Root Cause and Diff Summary sections |

---

## Prompt Structure

Built by `buildFixItSuggestionsPrompt()` in `src/lib/ai/prompt-builder.ts`.

The prompt includes:

1. **System context** — senior web performance engineer role
2. **Regression summary** — site name, URL, metric, % change (baseline → actual), severity, strategy
3. **Root Causes Identified** — one section per cause: title, description, evidence items (before/after deltas), and current recommendations
4. **What Changed** — formatted diff summary: network byte deltas, new third-party domains, main thread time, long task count, LCP resource change, TTFB delta
5. **Lighthouse Audit Details** — one section per relevant audit with score, display value, and up to 8 items (url, wastedBytes, wastedMs, totalBytes, blockingTime)

The requested output format is, for **each root cause**:

```
## {Cause Title}

### Fix: {Descriptive Fix Name}
**Why this helps:** {one sentence}
**Before:**
```html|css|js
{before code}
```
**After:**
```html|css|js
{after code}
```
**Expected impact:** {estimated improvement to regressed metric}
```

### Rule → Audit ID Mapping

The prompt only includes audits that are actually relevant to the detected regression causes. The mapping lives in `RULE_TO_AUDIT_IDS` (private constant in `prompt-builder.ts`):

| Rule ID | Lighthouse Audit IDs |
|---------|----------------------|
| `render-blocking` | `render-blocking-resources`, `unused-css-rules` |
| `js-bloat` | `bootup-time`, `unused-javascript`, `total-byte-weight` |
| `lcp-resource` | `largest-contentful-paint-element`, `uses-optimized-images` |
| `legacy-js` | `legacy-javascript` |
| `cls` | `layout-shift-elements`, `non-composited-animations` |
| `third-party` | `third-party-summary`, `third-party-facades` |
| `main-thread` | `long-tasks`, `mainthread-work-breakdown` |
| `ttfb` | `server-response-time`, `redirects` |

---

## Rate Limiting

| Layer | Behaviour |
|-------|-----------|
| Per-alert cooldown | 60 minutes between regenerations for the same alert |
| Per-user daily limit | 5 generations/day (Redis key: `fix-it-suggestions`) |

Both limits return HTTP 429. The cooldown response includes a `Retry-After` header (seconds) and a `retryAfterSeconds` field in the JSON body. The UI shows a countdown ("Available in Xm") when cooling down.

---

## Database Schema

Three nullable fields were added to the `RegressionAlert` model:

```prisma
fixItSuggestions      String?   @db.Text   // The generated Markdown fix suggestions
fixItSuggestionsAt    DateTime?             // When they were last generated
fixItSuggestionsModel String?               // Which model was used (e.g. "gpt-4o-mini")
```

Migration: `prisma/migrations/20260310100000_add_fix_it_suggestions_to_regression_alert/`

---

## Feature Flag

The feature is gated by `FEATURE_FLAGS.FIX_IT_SUGGESTIONS` (`"fix_it_suggestions"` in PostHog).

The API route defaults to `true` — the feature is active unless explicitly disabled. To disable for a user or cohort, add a `fix_it_suggestions` flag with `false` override in PostHog.

---

## Environment Variable

Uses the same key as all other AI features:

```env
OPENAI_API_KEY=sk-...
```

Validated at startup via `src/env.js`. The app will fail to start if the key is missing.

---

## Architecture Decisions

**Why stream instead of a background job?**
The user has clicked a button and is actively waiting. Streaming gives instant perceived feedback (first tokens appear in ~300ms) vs. polling a background job. The pattern is identical to the AI Run Summary.

**Why per-alert cooldown in addition to the daily limit?**
The daily limit prevents cost runaway across all alerts. The per-alert cooldown prevents a single alert being regenerated in a loop (e.g., a user clicking Regenerate repeatedly hoping for a different result). Together they give predictable cost bounds per user per day.

**Why filter audits by rule ID instead of sending all audits?**
A run can have 40-60 audits. Sending all of them would bloat the prompt significantly, pushing it toward the model's context limit and adding noise that dilutes the fix quality. Pre-filtering to the 2-4 audits actually relevant to the detected causes keeps the prompt focused and the output concrete.

**Why `useCompletion` over `useChat`?**
`useCompletion` (`@ai-sdk/react`) is the right primitive for one-shot text generation. No message history or turn management is needed. Same rationale as the AI Run Summary.

**Why cache in DB?**
Avoids paying for regeneration on every page view. The 60-minute cooldown aligns cache freshness with a reasonable "something might have changed in the code" window. The `fixItSuggestionsModel` field tracks which model produced the cached result, enabling future model upgrades without ambiguity.

**Why prompt injection protection on audit URLs?**
Audit item `url` fields come from the monitored site's content, not user input. A crafted resource URL could attempt to inject instructions into the prompt. `sanitizeForPrompt()` is applied to all external strings (site name, URL, resource URLs, domain strings) before interpolation — low cost, defence-in-depth.

---

## Local Development

The feature is enabled by default (`defaultValue: true` in the API route). To test:

1. Ensure `OPENAI_API_KEY=sk-...` is in `.env.local`
2. `pnpm dev:all`
3. Navigate to any regression alert detail page for a successful run
4. The **Fix-It Suggestions** card appears between the Root Cause Analysis and Diff Summary sections
5. Click **"Generate Fix Suggestions"** — the response streams in real time
6. Refresh the page — suggestions load instantly from the DB
7. Click **"Regenerate"** — disabled for 60 minutes after generation (countdown shown)

To seed regression alerts for testing:

```bash
pnpm seed:regressions your@email.com "Test Site" 3
```
