# Run History

The Run History page (`/history`) gives users a dedicated, interactive view of performance scores and Core Web Vitals over time for any site and monitor they own. Unlike the per-site chart on the Site Detail page (which always shows the last 30 runs), Run History is filterable by date range and separates the scores view from the Core Web Vitals view.

## Feature Overview

| Element | Description |
|---|---|
| **URL** | `/history` |
| **Auth** | Required (redirects to `/auth/signin`) |
| **Sidebar entry** | Run History (History icon) |
| **Data source** | `GET /api/runs` with `days`, `status`, and `limit` params |

### What the page shows

1. **Filter bar** — Site selector → Monitor selector → 7d / 14d / 30d tab strip. Changing any filter re-fetches runs from the API without a full page reload.
2. **Score snapshot** — Four `ScoreCard` tiles (Performance, Accessibility, Best Practices, SEO) labelled "Latest run · \<date\>", each showing the most recent run's score alongside a "Period avg: N" secondary stat computed from all loaded runs.
3. **Timeline chart** — Dual-tab Recharts line chart:
   - **Scores tab**: all four category scores on a single 0–100 Y axis.
   - **Core Web Vitals tab**: LCP, FCP, and TTFB in ms (left axis) + CLS × 1000 (right axis).
4. **Run log table** — One row per run, newest first, with scores via `ScoreBadge` and raw CWV values color-coded by thresholds. Each row links to the full Run Detail page.

---

## Architecture

The feature follows the standard server/client split used throughout the app.

```
/history (server component)
  └─ fetches sites + monitors (for selectors)
  └─ fetches initial runs for the default monitor (last 30 days, status=success)
  └─ renders <HistoryView> with props

<HistoryView> (client component)
  └─ owns selectedSiteId / selectedMonitorId / days state
  └─ on filter change → GET /api/runs?monitorId=X&days=Y&status=success&limit=100
  └─ computes period averages from loaded runs
  └─ renders "Latest run" label + <ScoreCard> strip, <RunHistoryChart>, <RunHistoryTable>
```

### API changes — `GET /api/runs`

Two new optional query parameters were added:

| Param | Type | Default | Effect |
|---|---|---|---|
| `days` | `7 \| 14 \| 30` | — | Filters `completedAt >= now - N days` |
| `status` | `RunStatus` string | — | Filters by run status (validated against the Prisma enum) |

When `days` is supplied, the default `limit` rises from 10 to 100 to cover dense history without needing an explicit `limit` param.

---

## New Files

### `src/app/(app)/history/page.tsx`

Server component. Fetches `prisma.site.findMany` (with monitors included) and the initial run batch for the default monitor, then renders the breadcrumb, page heading, and `<HistoryView>`.

### `src/components/history-view.tsx`

Client component. Owns all filter state. Calls `fetch(/api/runs?...)` on any change and keeps `runs` in local state. Computes period averages client-side from the loaded run array and passes them to `<ScoreCard>`. Renders the filter bar, latest-run label, score strip, chart, and table.

### `src/components/run-history-chart.tsx`

Recharts `LineChart` with internal `view` state (`"scores" | "cwv"`). Toggling the tab swaps the entire chart rather than hiding/showing individual lines, keeping the Y axis domains consistent within each view.

### `src/components/run-history-table.tsx`

Shadcn `Table` with CWV thresholds applied via a small `CwvCell` helper that computes a `text-score-good / warning / poor` class from the raw metric value. Sorted newest-first client-side (no extra API call needed since the data is already loaded).

---

## Seed Scripts for Testing

Two seed scripts create realistic run histories specifically designed to exercise the Run History page. Each script creates **one mobile and one desktop monitor** under the same site, so you can switch between strategies in the monitor dropdown and compare the characteristic difference in scores and timing metrics.

Both scripts are safe to re-run (they upsert the user, site, and monitors by fixed IDs).

### Mobile vs desktop metric modelling

Desktop Lighthouse runs skip CPU and network throttling, which produces consistently better results. The scripts reflect this:

| Factor | Mobile | Desktop |
|---|---|---|
| Performance score | baseline | ~8–12 pts higher |
| LCP / FCP | baseline | ~45% faster |
| TTFB | baseline | identical (server-side latency) |
| TBT | baseline | ~55% less (no CPU throttle) |
| A11y / BP / SEO | baseline | identical (same content, same audits) |

---

### `prisma/seed-decline.ts` — gradual performance decline

Creates runs that start healthy and steadily degrade across the time window for both strategies. Useful for verifying that the chart clearly shows a downward trend and that the score cards reflect the latest (worst) state.

**Metric trajectory:**

| Metric | Mobile start | Mobile end | Desktop start | Desktop end |
|---|---|---|---|---|
| Performance score | 91 | 42 | 97 | 55 |
| LCP | 1 600 ms | 5 500 ms | 900 ms | 3 100 ms |
| FCP | 1 200 ms | 4 200 ms | 700 ms | 2 400 ms |
| TTFB | 450 ms | 2 600 ms | 450 ms | 2 600 ms |
| CLS | 0.04 | 0.38 | 0.035 | 0.32 |
| TBT | 140 ms | 850 ms | 65 ms | 390 ms |

```bash
# Minimal
pnpm seed:decline your-email@example.com

# Full options: email name numRuns days
pnpm seed:decline your-email@example.com "Jane Doe" 60 30
```

**Arguments:**

| # | Name | Required | Default | Description |
|---|---|---|---|---|
| 1 | `email` | ✅ | — | Must match your sign-in email |
| 2 | `name` | — | `"Test User"` | Display name |
| 3 | `numRuns` | — | `30` | Runs **per monitor** (2–500); total = numRuns × 2 |
| 4 | `days` | — | `30` | Time window in days (1–365) |

After seeding, select **"Test Site (gradual decline)"** and toggle between the 📱 mobile and 🖥️ desktop monitors.

---

### `prisma/seed-improvement.ts` — gradual performance improvement

Creates runs that start poorly and recover across the time window for both strategies. Useful for verifying the upward trend rendering and confirming that the score cards show the latest (best) state.

**Metric trajectory:**

| Metric | Mobile start | Mobile end | Desktop start | Desktop end |
|---|---|---|---|---|
| Performance score | 41 | 93 | 53 | 98 |
| LCP | 5 800 ms | 1 500 ms | 3 200 ms | 850 ms |
| FCP | 4 400 ms | 1 100 ms | 2 600 ms | 640 ms |
| TTFB | 2 800 ms | 400 ms | 2 800 ms | 400 ms |
| CLS | 0.41 | 0.03 | 0.35 | 0.025 |
| TBT | 880 ms | 120 ms | 400 ms | 55 ms |

```bash
# Minimal
pnpm seed:improvement your-email@example.com

# Full options: email name numRuns days
pnpm seed:improvement your-email@example.com "Jane Doe" 60 30
```

Arguments are identical to `seed:decline`.

After seeding, select **"Test Site (gradual improvement)"** and toggle between the 📱 mobile and 🖥️ desktop monitors.

---

### Jitter and realism

Both scripts add ±4% random noise to every interpolated metric value. This makes the chart look like real monitoring data (with natural variance) rather than a perfectly straight line.

### Common workflow

```bash
# 1. Seed both datasets
pnpm seed:decline your-email@example.com
pnpm seed:improvement your-email@example.com

# 2. Open /history → select each site in turn

# 3. For each site, switch between 📱 mobile and 🖥️ desktop monitors
#    to see how the same trend plays out differently per strategy

# 4. Toggle 7d / 14d / 30d to see how the chart and period-avg ScoreCards adapt

# 5. Switch between Scores and Core Web Vitals chart tabs

# 6. Clean up when done
pnpm seed:clean
```

---

## CWV Thresholds

The table uses the standard Google thresholds to color-code each metric:

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2 500 ms | ≤ 4 000 ms | > 4 000 ms |
| FCP | ≤ 1 800 ms | ≤ 3 000 ms | > 3 000 ms |
| TTFB | ≤ 800 ms | ≤ 1 800 ms | > 1 800 ms |
| CLS × 1000 | ≤ 100 | ≤ 250 | > 250 |

Colors map to the project's CSS variables: `text-score-good`, `text-score-warning`, `text-score-poor`.

---

## Related Documentation

- **[DATABASE_SCRIPTS.md](../DATABASE_SCRIPTS.md)** — full guide to all seed and cleanup scripts
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — overall system design
- **[docs/REGRESSION_DETECTION.md](./REGRESSION_DETECTION.md)** — regression alert system used on the Alerts page
