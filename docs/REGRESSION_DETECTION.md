# Regression Detection Engine

## Overview

The Regression Detection Engine automatically identifies performance degradations in your monitored sites and provides intelligent root-cause analysis with actionable recommendations.

### What is Regression Detection?

Traditional performance monitoring tells you *what* changed ("LCP increased by 18%"), but not *why*. Our regression detection engine goes further by:

1. **Detecting Real Regressions**: Filters out noise using statistical baselines and metric-specific thresholds
2. **Identifying Root Causes**: Applies 8 intelligent rules to determine likely causes (e.g., "analytics.example.com was added, +210KB, +420ms scripting time")
3. **Providing Evidence**: Shows before/after comparisons across network, main thread, rendering, and backend dimensions
4. **Recommending Actions**: Suggests specific fixes based on the identified causes

### Key Capabilities

- **Automatic Baseline Calculation**: Rolling median from last 30 successful runs per monitor
- **Multi-Metric Detection**: Tracks LCP, TBT, CLS, INP, FCP, and TTFB regressions
- **Confidence Scoring**: Classifies regressions as low/medium/high confidence based on consecutive occurrences
- **Severity Classification**: Minor (<20% over), Moderate (20-50%), Critical (>50%)
- **8 MVP Rules**: JS bloat, third-party scripts, LCP resource changes, TTFB increases, layout shifts, render-blocking, main thread contention, legacy JS
- **Rich Evidence**: Before/after metrics, resource deltas, audit score changes, new domains detected

## Architecture

### Data Model

```typescript
// Stores rolling median baseline per metric per monitor
model RegressionBaseline {
  id           String   @id
  monitorId    String
  metricName   String   // "lcp", "tbt", "cls", "inp", "fcp", "ttfb"
  medianValue  Float    // Rolling median value
  sampleSize   Int      // Number of runs in calculation
  calculatedAt DateTime

  @@unique([monitorId, metricName])
}

// Stores detected regressions with root cause analysis
model RegressionAlert {
  id             String   @id
  runId          String
  metricName     String
  baselineValue  Float
  actualValue    Float
  delta          Float
  percentChange  Float
  severity       String   // "minor", "moderate", "critical"
  confidence     String   // "low", "medium", "high"

  likelyCauses   Json?    // Array of ranked RootCause objects
  diffSummary    Json?    // DiffSummary object

  status         String   // "open", "acknowledged", "resolved"
  notes          String?
}
```

### Processing Pipeline

```
Run Completes (status=success)
  ↓
Worker Processor
  ↓
Regression Detection
  ├─ Load baselines for monitor
  ├─ Check each metric against thresholds
  ├─ Calculate severity (based on % over threshold)
  └─ Calculate confidence (based on consecutive regressions)
  ↓
Root Cause Analysis (if regressions detected)
  ├─ Calculate diff summary (network/mainThread/rendering/backend)
  ├─ Load baseline run and insights
  ├─ Apply all 8 rules
  ├─ Rank by: confidence × estimatedImpact × evidence.length
  └─ Return top 5 causes
  ↓
Save Alerts
  └─ Create RegressionAlert with causes + diffSummary
  ↓
Recalculate Baselines (async, fire-and-forget)
  └─ Update medians from last 30 runs
```

### Components

**Core Logic** (`src/lib/regression/`):
- `baseline-calculator.ts`: Calculates rolling median baselines
- `detector.ts`: Detects regressions using thresholds
- `diff-engine.ts`: Computes before/after deltas across 4 dimensions
- `rules-engine.ts`: Framework for root-cause analysis
- `rules/`: 8 rule implementations

**UI Components** (`src/components/`):
- `regression-alert-card.tsx`: Summary card with severity badges
- `root-cause-panel.tsx`: Ranked causes with evidence tables
- `regression-evidence-table.tsx`: Detailed diff comparison

**Pages** (`src/app/`):
- `runs/[id]/page.tsx`: Shows alerts on run details page
- `runs/[id]/regressions/[alertId]/page.tsx`: Full root-cause analysis page

**API** (`src/app/api/`):
- `GET /api/runs/[id]/regressions`: List alerts for a run
- `GET /api/regressions/[alertId]`: Get alert details
- `PATCH /api/regressions/[alertId]`: Update alert status/notes

## How It Works

### 1. Baseline Calculation

**When**: After every successful run (async)
**Algorithm**: Rolling median of last 30 runs per metric

```typescript
// Example: LCP baseline for a monitor
Runs: [2000, 2100, 1950, 2050, ...]  // Last 30 LCP values
Median: 2025ms  // Stored in RegressionBaseline
```

**Why median?** More robust to outliers than mean. A single spike doesn't skew the baseline.

### 2. Regression Detection

**When**: Immediately after run completes (synchronous in worker)
**Thresholds**: Metric-specific, requires BOTH conditions met

| Metric | Percent Change | Absolute Change |
|--------|----------------|-----------------|
| LCP    | 15%            | 300ms           |
| TBT    | 20%            | 100ms           |
| CLS    | 25%            | 0.05            |
| INP    | 20%            | 100ms           |
| FCP    | 15%            | 300ms           |
| TTFB   | 20%            | 200ms           |

**Example**: LCP regresses if `percentChange >= 15% AND delta >= 300ms`

**Severity Classification**:
- **Minor**: < 20% over threshold
- **Moderate**: 20-50% over threshold
- **Critical**: > 50% over threshold

**Confidence Scoring**:
- **Low**: First occurrence (this run only)
- **Medium**: 2 consecutive regressions
- **High**: 3+ consecutive regressions

### 3. Diff Engine

Calculates detailed before/after comparison across 4 dimensions:

**Network**:
- Total bytes delta
- Request count delta
- JS/CSS/Image/Font byte deltas
- Third-party byte delta
- New domains added
- Removed domains

**Main Thread**:
- Scripting time delta (from `bootup-time`)
- Rendering time delta (from `mainthread-work-breakdown`)
- Long task count delta

**Rendering**:
- LCP resource changed (URL before/after)
- CLS shift sources changed

**Backend**:
- TTFB delta
- Server latency delta (from `network-server-latency`)

### 4. Root-Cause Rules Engine

Applies 8 rules to infer likely causes:

#### Rule 1: JS Bloat
**Applies to**: LCP, TBT, INP
**Trigger**: JS bytes increased >50KB OR scripting time increased >100ms
**Evidence**: Top JS files by execution time, bootup-time score delta
**Confidence**: High if bootup-time score drops >0.1

#### Rule 2: Third-Party Scripts
**Applies to**: LCP, TBT, INP, FCP
**Trigger**: New third-party domain OR third-party bytes increased >50KB
**Evidence**: New domains list, blocking time per script
**Confidence**: High if new domain detected

#### Rule 3: LCP Resource Change
**Applies to**: LCP
**Trigger**: LCP resource URL changed OR image bytes increased >100KB
**Evidence**: LCP resource before/after, image byte delta, lazy-loading detection
**Confidence**: Very high if resource actually changed

#### Rule 4: TTFB / Backend
**Applies to**: LCP, FCP, TTFB
**Trigger**: TTFB increased >100ms
**Evidence**: TTFB delta, server latency by origin
**Confidence**: High if TTFB +200ms

#### Rule 5: Layout Shifts (CLS)
**Applies to**: CLS
**Trigger**: CLS regressed
**Evidence**: Shift elements before/after, new shift sources
**Confidence**: High if specific elements identified

#### Rule 6: Render-Blocking Resources
**Applies to**: FCP, LCP
**Trigger**: New blocking resources OR render-blocking audit worsens
**Evidence**: New blocking resources, byte delta
**Confidence**: Medium if new resource added

#### Rule 7: Main Thread Contention
**Applies to**: TBT, INP
**Trigger**: Long tasks increased OR main thread time increased >100ms
**Evidence**: Long task count, main thread breakdown by category
**Confidence**: High if 3+ new long tasks

#### Rule 8: Legacy JavaScript
**Applies to**: TBT, INP
**Trigger**: Legacy JS audit worsens OR legacy bytes increased
**Evidence**: Polyfill size delta, top legacy files
**Confidence**: High if legacy JS +100KB

**Ranking Algorithm**: `score = confidence × estimatedImpact × evidence.length`

Top 5 causes returned to user.

## Usage Guide

### For Developers

**View Regressions in UI**:
1. Navigate to Run Details page
2. If regressions detected, you'll see a red "Performance Regressions Detected" section
3. Each alert shows: metric, baseline vs current, severity, confidence, top cause
4. Click "View Root Cause Analysis" for full details

**Regression Details Page**:
- Header: Metric name, severity, confidence, delta summary
- Root Cause Analysis: Top 3 ranked causes with evidence tables and recommendations
- Performance Changes: Diff summary across Network/Main Thread/Rendering/Backend

**Interpreting Alerts**:
- **Severity badges**: Red (critical) requires immediate attention, orange (moderate) should be addressed soon, yellow (minor) can be monitored
- **Confidence badges**: Green (high) = very likely the root cause, gray (low) = possible cause but uncertain
- **Evidence tables**: Before/After comparison with deltas highlighted in orange/red

### For Administrators

**Configuration**:

Thresholds are hardcoded in `src/lib/regression/detector.ts`. To customize:

```typescript
const REGRESSION_THRESHOLDS = {
  lcp: { percentChange: 15, absoluteChange: 300 },
  // Adjust values here
};
```

**Baseline Settings**:
- Window size: 30 runs (default)
- Minimum sample size: 5 runs (default)

Modify in `src/lib/regression/baseline-calculator.ts`:

```typescript
const BASELINE_WINDOW_SIZE = 30;
const MIN_SAMPLE_SIZE = 5;
```

**Diagnostic Allowlist**:

Control which PSI audits are extracted in `src/lib/psi-parser.ts`:

```typescript
const DIAGNOSTIC_ALLOWLIST = new Set([
  "unused-javascript",
  "network-requests",
  // Add/remove audits here
]);
```

## Testing

### Run Unit Tests

```bash
pnpm test src/lib/regression
```

Tests include:
- `baseline-calculator.test.ts`: Median calculation, edge cases
- `detector.test.ts`: Threshold logic, severity/confidence classification
- `rules-engine.test.ts`: Cause ranking, rule filtering

### Run Integration Tests

```bash
pnpm test src/worker/__tests__/processor-regression
```

### Manual Testing

**Create Synthetic Regression**:

1. Create a monitor with 30 baseline runs (LCP ~2000ms):
```bash
# Use the app UI or seed script
```

2. Create a regressed run:
```bash
# Manually trigger a run or modify PSI response
# to return LCP=3000ms (+50%)
```

3. Verify:
   - RegressionAlert created in database
   - Severity = "critical" (>50% regression)
   - Confidence = "low" (first occurrence)
   - likelyCauses populated with ranked causes
   - UI displays alert on run details page

**Debug Mode**:

Run worker with `--debug-psi` flag to inspect extracted PSI data:

```bash
NODE_ENV=development node src/worker/index.ts --debug-psi
```

Writes PSI response to `psi-debug.json` for inspection.

## Trade-offs & Design Decisions

### 1. JSON Storage for Causes/Evidence

**Decision**: Store `likelyCauses` and `diffSummary` as JSON fields
**Rationale**: Flexible schema, simpler queries, read-only data doesn't need normalization
**Trade-off**: Less queryable (can't filter by specific cause ID easily), but acceptable for this use case

### 2. Synchronous Detection

**Decision**: Run detection immediately in worker transaction
**Rationale**: Immediate feedback, simpler architecture
**Trade-off**: Adds ~200-500ms to job processing time, but acceptable for batch jobs
**Alternative Considered**: Async background job, but adds complexity

### 3. Code-Based Rules

**Decision**: Implement rules as TypeScript functions
**Rationale**: Faster to implement, type-safe, easier to debug
**Trade-off**: Less flexible than data-driven rules (require code changes to add rules)
**Future**: Could migrate to data-driven rules (SQL/JSON config) for non-technical users

### 4. Median Baseline

**Decision**: Use median instead of mean
**Rationale**: Robust to outliers (single spike doesn't skew baseline)
**Trade-off**: Requires sorting (negligible with 30-run window)

### 5. 30-Run Window

**Decision**: Use last 30 runs for baseline
**Rationale**: Balances stability (enough data) vs freshness (reflects recent performance)
**Trade-off**: Slower to adapt to intentional performance improvements
**Alternative**: Could use time-based window (last 7 days) instead of count-based

### 6. Extended Insight Model

**Decision**: Store network-requests in existing `Insight.sources` JSON field
**Rationale**: No schema change needed, leverages existing flexibility
**Trade-off**: Less typed (JSON vs dedicated columns), but flexible for evolving PSI data

## Troubleshooting

### Regression Not Detected

**Check**:
1. Does baseline exist? `SELECT * FROM "RegressionBaseline" WHERE "monitorId" = ?`
2. Does delta exceed BOTH thresholds? (15% AND 300ms for LCP)
3. Are there at least 5 successful runs? (MIN_SAMPLE_SIZE)
4. Is metric value null in run?

**Solution**:
- Ensure monitor has 5+ successful runs
- Verify thresholds are appropriate for your site
- Check worker logs for detection messages

### Wrong Cause Identified

**Check**:
1. Inspect `diffSummary` field in RegressionAlert
2. Verify rule triggers correctly (read rule code in `src/lib/regression/rules/`)
3. Check evidence quality (do before/after values make sense?)

**Solution**:
- Rules are confidence-based heuristics, not deterministic
- Review evidence and recommendations carefully
- Consider adjusting rule confidence thresholds if consistently wrong

### Performance Impact

**Symptom**: Worker jobs taking significantly longer

**Check**:
- Regression detection adds ~200-500ms per run
- Root cause analysis adds ~300-700ms (if regression detected)

**Solution**:
- This is expected overhead for the feature
- Detection only runs on successful runs (not failed/queued)
- If unacceptable, consider making detection fully async

### Missing Insights

**Symptom**: Rules have no evidence, diffSummary empty

**Check**:
1. Are diagnostics being extracted? Check `DIAGNOSTIC_ALLOWLIST` in `psi-parser.ts`
2. Run with `--debug-psi` to inspect PSI response
3. Does PSI API return the expected audits?

**Solution**:
- PSI API may not return all audits for all sites
- Some audits only appear if they fail (score < 1)
- Ensure `DIAGNOSTIC_ALLOWLIST` includes necessary audits

## Future Enhancements

### Phase 7: Alerting (Email/Slack)
- Send notifications for critical regressions
- Configurable alert rules per monitor
- Batch daily/weekly regression summaries

### Phase 8: Performance Budgets
- Set thresholds per monitor (LCP < 2.5s, TBT < 200ms)
- Alert when budget exceeded (distinct from regression detection)
- Budget status on site overview page

### Phase 9: CI/CD Integration
- Webhook to correlate regressions with deployments
- Tag regressions with commit SHA
- GitHub PR comments with regression warnings

### Phase 10: Advanced Rules
- Font-loading rule (FOUT, FOIT detection)
- Prefetch/preload rule (missing resource hints)
- WASM rule (WebAssembly impact on TBT/INP)
- Video playback rule (autoplay impact on LCP)

### Phase 11: ML-Based Detection
- Learn custom patterns per site (time-of-day variations)
- Predict regressions before they occur (trend analysis)
- Automatically tune thresholds per site

### Phase 12: Regression Replay
- Re-run PSI on regressed run to confirm persistence
- Detect transient vs persistent regressions
- Auto-resolve if regression disappears on retry

## API Reference

### Types

```typescript
interface RegressionAlert {
  id: string;
  runId: string;
  metricName: string;
  baselineValue: number;
  actualValue: number;
  delta: number;
  percentChange: number;
  severity: "minor" | "moderate" | "critical";
  confidence: "low" | "medium" | "high";
  likelyCauses?: RootCause[];
  diffSummary?: DiffSummary;
  status: "open" | "acknowledged" | "resolved";
}

interface RootCause {
  id: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  estimatedImpact: number; // ms
  evidence: EvidenceItem[];
  recommendations: string[];
}

interface DiffSummary {
  network: {
    totalBytesDelta: number;
    requestCountDelta: number;
    jsBytesDelta: number;
    thirdPartyBytesDelta: number;
    newDomains: string[];
    removedDomains: string[];
  };
  mainThread: {
    scriptingTimeDelta: number;
    renderingTimeDelta: number;
    longTaskCountDelta: number;
  };
  rendering: {
    lcpResourceChanged: boolean;
    lcpResourceBefore: string | null;
    lcpResourceAfter: string | null;
  };
  backend: {
    ttfbDelta: number;
    serverLatencyDelta: number;
  };
}
```

### Functions

**`calculateBaselines(monitorId: string): Promise<void>`**
Calculates rolling median baseline for all metrics from last 30 runs.

**`detectRegressions(run: Run): Promise<RegressionAlertData[]>`**
Detects regressions by comparing run metrics against baselines.

**`analyzeRootCauses(metricName: string, run: Run): Promise<RootCause[]>`**
Applies 8 rules to identify likely causes, returns top 5 ranked by confidence × impact.

**`calculateDiffSummary(run: Run): Promise<DiffSummary>`**
Computes before/after deltas across network/mainThread/rendering/backend.

### API Endpoints

**`GET /api/runs/[id]/regressions`**
Returns all regression alerts for a run.

Response:
```json
{
  "alerts": [
    {
      "id": "alert-123",
      "runId": "run-456",
      "metricName": "lcp",
      "baselineValue": 2000,
      "actualValue": 2500,
      "delta": 500,
      "percentChange": 25,
      "severity": "moderate",
      "confidence": "high"
    }
  ]
}
```

**`GET /api/regressions/[alertId]`**
Returns specific alert with full details (causes, diffSummary).

**`PATCH /api/regressions/[alertId]`**
Updates alert status or notes.

Request:
```json
{
  "status": "resolved",
  "notes": "Fixed by reverting analytics script"
}
```

---

**Implementation Status**: ✅ Complete (Phases 1-6)
**Last Updated**: 2026-02-23
