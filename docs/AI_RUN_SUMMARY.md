# AI Run Summary

This document explains the AI Analysis feature added to the run detail page.

---

## Overview

Each successful run can have an AI-generated narrative summary produced by **GPT-4o-mini** (via the [Vercel AI SDK](https://sdk.vercel.ai/)).

The summary is:
- **Streamed** to the browser in real time — no blank spinner waiting for the full response
- **Cached in the database** after the first generation — subsequent page loads show it instantly
- **Regenerable** on demand via a "Regenerate" button

---

## Data Flow

```
User clicks "Generate AI Analysis"
  → POST /api/runs/[id]/ai-summary
      → auth() check
      → Prisma: fetch run with monitor.site, regressionAlerts, insights, audits
      → buildRunAnalysisPrompt(run) → structured prompt string
      → streamText({ model: openai("gpt-4o-mini"), prompt })
          onFinish → prisma.run.update({ aiSummary, aiSummaryAt, aiSummaryModel })
      → toTextStreamResponse() → streamed back to client
  → useCompletion streams text into the card in real time
```

On next page load the server-rendered `initialSummary` prop is already populated — no API call needed.

---

## Files

| File | Purpose |
|---|---|
| `src/lib/ai/constants.ts` | Shared constants: model name, error codes, rate-limit config |
| `src/lib/ai/prompt-builder.ts` | Pure function: builds the LLM prompt from run data |
| `src/app/api/runs/[id]/ai-summary/route.ts` | POST handler: streams GPT-4o-mini response, caches result |
| `src/components/run-ai-summary.tsx` | Client component: button, streaming display, markdown render |
| `src/app/runs/[id]/page.tsx` | Renders `<RunAISummary>` after the score cards section |

---

## Prompt Structure

The prompt is built by `buildRunAnalysisPrompt(run)` in `src/lib/ai/prompt-builder.ts`.

It includes:
1. System context (senior web performance engineer role, URL, strategy)
2. **Performance Scores** — with Good / Needs Improvement / Poor labels
3. **Core Web Vitals** — LCP, INP, TBT, CLS, FCP, TTFB with threshold-based labels
4. **Regression Alerts** — severity, metric, % change vs baseline, top likely cause
5. **Top 5 Insights** — sorted by total `metricSavings`, with up to 3 resource URLs each
6. **Failed Audits** — title and display value for the first 10 failed scored audits

The requested output format (Markdown) is:
1. **Executive Summary** — 2-3 sentences
2. **Priority Action Items** — top 3-5 ordered by impact, with specific resource URLs
3. **Strengths** — 1-3 bullets for metrics/audits in the good range

---

## Database Schema

Three nullable fields were added to the `Run` model:

```prisma
aiSummary      String?   @db.Text   // The generated Markdown summary
aiSummaryAt    DateTime?             // When it was last generated
aiSummaryModel String?               // Which model was used (e.g. "gpt-4o-mini")
```

Migration: `prisma/migrations/20260225210041_add_ai_summary_to_run/`

---

## Environment Variable

Add to `.env.local` (or production secrets):

```env
OPENAI_API_KEY=sk-...
```

Validated at startup via `src/env.js` (T3 Env pattern). The app will fail to start if the key is missing.

---

## Architecture Decisions

**Why stream?**
GPT-4o-mini responses take 2-5 seconds. Streaming gives instant perceived feedback vs. a blank spinner.

**Why `useCompletion` over `useChat`?**
`useCompletion` (`@ai-sdk/react`) is the right primitive for one-shot text generation, not a chat loop. Simpler API, no message history overhead.

**Why cache in DB?**
Avoids paying for regeneration on every page view. The user can explicitly click "Regenerate" when they want a fresh summary. The `aiSummaryModel` field tracks which model version was used, enabling future model upgrades without ambiguity.

**Why `src/lib/ai/prompt-builder.ts`?**
Separates prompt logic from HTTP/streaming logic. Independently testable — you can unit test prompt output without touching the API route or the AI client.

**Why not `react-markdown`?**
The content is entirely AI-generated (not user input), so a lightweight inline renderer without the extra dependency is sufficient for a PoC. The `MarkdownContent` component in `run-ai-summary.tsx` handles headings, bold, italic, and bullet lists via a simple regex transform.

---

## Usage

1. Add `OPENAI_API_KEY=sk-...` to `.env.local`
2. Start: `pnpm dev:all`
3. Navigate to a **successful** run's detail page
4. Click **"Generate AI Analysis"** — the summary streams in real time
5. Refresh the page — the summary loads instantly from the DB
6. Click **"Regenerate"** to produce a new summary
