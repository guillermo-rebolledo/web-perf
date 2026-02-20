# Insight Sources

Each insight from PageSpeed Insights can include a `sources` array — per-resource details explaining **which specific resources** are causing the performance issue.

Stored as `Json?` on the `Insight` model (`sources` column). The shape varies by insight type.

## How audits become insights

The PSI API returns many audits. We store a subset as `Insight` records based on two criteria:

### 1. Native insight audits (id ends with `-insight`)

These are PSI's own insight audits. Included when `score < 1` and `score !== null`.

| Audit ID                          | What it measures                                  | Source fields                      |
| --------------------------------- | ------------------------------------------------- | ---------------------------------- |
| `image-delivery-insight`          | Images not using modern formats (WebP/AVIF)       | `url`, `totalBytes`, `wastedBytes` |
| `render-blocking-insight`         | Resources blocking first paint (CSS, sync JS)     | `url`, `totalBytes`, `wastedMs`    |
| `network-dependency-tree-insight` | Critical request chains delaying page load        | `url`, `transferSize`, `depth`     |
| `font-display-insight`            | Fonts without `font-display` causing layout shift | `url`, `wastedMs`                  |
| `third-parties-insight`           | Third-party scripts impacting load time           | `url`, `transferSize`              |
| `viewport-insight`                | Missing or misconfigured viewport meta tag        | —                                  |
| `inp-breakdown-insight`           | Interaction to Next Paint breakdown               | —                                  |

### 2. Allowlisted diagnostic audits

Some regular diagnostic audits have valuable per-resource `details.items` data. We promote these to insights so users see which specific resources to fix. Defined in `DIAGNOSTIC_WHITELIST` in `src/lib/psi-parser.ts`.

| Audit ID            | What it measures                                              | Source fields                      |
| ------------------- | ------------------------------------------------------------- | ---------------------------------- |
| `unused-javascript` | JS bundles with dead code that could be removed or code-split | `url`, `totalBytes`, `wastedBytes` |
| `unused-css-rules`  | CSS rules not used by the page                                | `url`, `totalBytes`, `wastedBytes` |
| `redirects`         | Redirect chains adding latency before page load               | `url`, `wastedMs`                  |
| `total-byte-weight` | Largest resources by transfer size                            | `url`, `totalBytes`                |
| `bootup-time`       | Scripts with high parse/compile/execution time                | `url`                              |

### 3. Regular audits (everything else)

Stored in the `Audit` model with score and display value only — no per-resource details. Examples: `largest-contentful-paint`, `speed-index`, `interactive`, `mainthread-work-breakdown`.

## Source types

### Flat sources (most insights)

Used by most insights and all Allowlisted diagnostics.

| Field         | Type      | Description                                     |
| ------------- | --------- | ----------------------------------------------- |
| `url`         | `string`  | The resource contributing to the issue          |
| `totalBytes`  | `number?` | Current transfer size in bytes                  |
| `wastedBytes` | `number?` | Bytes saveable by following the recommendation  |
| `wastedMs`    | `number?` | Time (ms) saveable (render-blocking, redirects) |

### Chain sources (network dependency tree)

Used by `network-dependency-tree-insight`. The PSI API returns a recursive tree of request chains; we flatten it into a list with depth information.

| Field          | Type      | Description                                                    |
| -------------- | --------- | -------------------------------------------------------------- |
| `url`          | `string`  | The resource in the chain                                      |
| `transferSize` | `number?` | Transfer size in bytes                                         |
| `depth`        | `number`  | Nesting level (0 = root document, 1 = direct dependency, etc.) |

**Raw API shape** (recursive tree):

```json
{
  "type": "list-section",
  "value": {
    "type": "network-tree",
    "chains": {
      "<id>": {
        "url": "https://example.com/",
        "transferSize": 7530,
        "children": {
          "<id>": {
            "url": "https://example.com/style.css",
            "transferSize": 6035,
            "children": { ... }
          }
        }
      }
    }
  }
}
```

**Flattened output** (what we store):

```json
[
  { "url": "https://example.com/", "transferSize": 7530, "depth": 0 },
  { "url": "https://example.com/style.css", "transferSize": 6035, "depth": 1 },
  { "url": "https://example.com/font.woff2", "transferSize": 15237, "depth": 2 }
]
```

## Scored vs unscored

Each audit/insight has a `scored` boolean indicating whether it contributes to a Lighthouse category score (Performance, Accessibility, etc.).

This is derived from `categories.<name>.auditRefs` in the PSI API response. Each `auditRef` has a `weight` field — audits with `weight > 0` are scored, those with `weight: 0` are unscored recommendations.

In the UI, unscored audits and insights display an **"Unscored"** badge with a tooltip explaining that it's a recommendation that doesn't affect the score. This helps users distinguish between metrics that directly impact their score and actionable recommendations.

Stored as `Boolean` on both the `Audit` and `Insight` models (defaults: `true` for audits, `false` for insights).

## How the parser works

In `src/lib/psi-parser.ts`, the insight extraction logic:

1. Builds a `scoredAuditIds` set from all `auditRefs` with `weight > 0` across all categories
2. Filters audits that match `-insight` suffix OR are in `DIAGNOSTIC_ALLOWLIST`
3. Only includes audits with `score < 1` and `score !== null`
4. Tags each audit/insight with `scored: scoredAuditIds.has(id)`
5. Extracts sources from `details.items`:
   - **Flat items first** — filters items with a `url` field, maps to `{ url, totalBytes?, wastedBytes?, wastedMs? }`
   - **Chain fallback** — if no flat items found, looks for `list-section` items with `value.type === "network-tree"` and recursively flattens via `flattenChains()`

## Display guidelines

### Byte-based insights

Show a table per insight with columns: **Resource | Size | Potential Savings**

```
hero.png         244 KB    → save 92 KB
logo.png          15 KB    → save 8 KB
```

### Time-based insights

Show: **Resource | Wasted Time**

```
styles.css       200 ms
app.js           100 ms
```

### Chain/tree insights

Show: **Resource | Transfer Size**, with left padding proportional to `depth` and a `└` prefix for child nodes.

```
example.com/              7.3 KB
  └ style.css             5.9 KB
    └ font.woff2         14.9 KB
  └ app.js                2.3 KB
```

### Formatting

- Convert raw bytes to KB/MB using `formatBytes()` from `src/lib/utils.ts`
- Truncate long URLs to filename using `extractFilename()` from `src/lib/url-utils.ts`; show full URL on hover (link opens resource in new tab)
- Group sources under their parent insight — they only make sense in context of the insight title
- Hide the sources section when the field is `null` or empty

### Mental model

The insight **title** tells the user _what to fix_. The sources **table** tells them _where to fix it_ and _how much they'd gain_.
