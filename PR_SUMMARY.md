## Summary

Run details and create-monitor/create-site flows are updated with new metric UI, renamed components, and clearer form layouts.

## Changes

**Run details page**
- Replaced `MetricBadge` with new **MetricCard** for Core Web Vitals and extra metrics (value + unit pinned to bottom of card).
- Replaced **ScoreStatCard** with **ScoreStat** (file rename + small API tweaks).
- Run header layout and breadcrumb tweaks; Core Web Vitals section uses plain heading/description text instead of card title/description components.
- Added external link treatment for final URL where relevant.

**Forms**
- **Monitor form**: New dialog title (“Configure Audit Monitor”), “Scan Frequency” and “Audit Strategy” labels, **RadioGroup** for mobile/desktop with card-style options and descriptions, and info banner copy for default options and paused state.
- **Site form**: Aligned with same dialog/label patterns and small UX improvements.

**UI / components**
- New **MetricCard** (threshold-based coloring, optional subtitle, value/unit block).
- New **RadioGroup** (shadcn-style).
- Minor updates to **Dialog**, **Label**, **Button**, **Select**; **ScoreBadge** exports/usage adjusted.

**Tests**
- Added **monitor-form** test suite (trigger, dialog content, strategy selection, submit payload, error handling).
- **site-form** test updated for current copy/behavior.
