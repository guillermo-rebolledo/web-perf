import type { RunPageAudit } from "@/types/prisma";

interface PromptInsight {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scored: boolean;
  displayValue: string | null;
  metricSavings: unknown;
  sources: unknown;
}

interface PromptRegressionAlert {
  metricName: string;
  severity: string;
  confidence: string;
  percentChange: number;
  likelyCauses?: unknown;
}

interface RunForPrompt {
  finalUrl: string | null;
  monitor: { strategy: string; site: { url: string; name: string } };
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcp: number | null;
  inp: number | null;
  tbt: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  regressionAlerts?: PromptRegressionAlert[] | null;
  insights: PromptInsight[];
  audits: RunPageAudit[];
}

/**
 * Strips common prompt-injection trigger phrases from user-supplied or
 * externally-derived strings before they are interpolated into LLM prompts.
 *
 * Motivation: `siteName`, `siteUrl`, and resource URLs originate from
 * user input or the monitored site's content. Without sanitization, a
 * crafted value could attempt to override the prompt's instructions.
 * Impact is self-contained (output reaches only the site owner), but
 * defence-in-depth is cheap here.
 *
 * @param text   The string to sanitize.
 * @param maxLength  Truncate to this length before pattern stripping (default 300).
 */
function sanitizeForPrompt(text: string, maxLength = 300): string {
  return text
    .slice(0, maxLength)
    .replace(/ignore\s+(all\s+)?(previous|prior)\s+(instructions?|prompts?)/gi, "[filtered]")
    .replace(/disregard\s+(all\s+)?(previous|prior)/gi, "[filtered]")
    .replace(/new\s+instructions?\s*:/gi, "[filtered]")
    .replace(/system\s*prompt\s*:/gi, "[filtered]")
    .replace(/<\|.*?\|>/g, "[filtered]"); // special token delimiters used by some models
}

function scoreLabel(score: number | null): string {
  if (score === null) return "N/A";
  const pct = Math.round(score * 100);
  if (pct >= 90) return `${pct} (Good)`;
  if (pct >= 50) return `${pct} (Needs Improvement)`;
  return `${pct} (Poor)`;
}

function metricLabel(value: number | null, unit: string, goodBelow: number, needsBelow: number): string {
  if (value === null) return "N/A";
  const rounded = unit === "" ? value.toFixed(3) : Math.round(value).toString();
  const label = value <= goodBelow ? "Good" : value <= needsBelow ? "Needs Improvement" : "Poor";
  return `${rounded}${unit ? " " + unit : ""} (${label})`;
}

export function buildRunAnalysisPrompt(run: RunForPrompt): string {
  const url = sanitizeForPrompt(run.finalUrl ?? run.monitor.site.url);
  const strategy = run.monitor.strategy;
  const siteName = sanitizeForPrompt(run.monitor.site.name);

  const lines: string[] = [];

  lines.push(`You are a senior web performance engineer reviewing a Google Lighthouse / PageSpeed Insights audit for **${siteName}** (${url}) on **${strategy}**.`);
  lines.push("");
  lines.push("## Performance Scores");
  lines.push(`- Performance: ${scoreLabel(run.performanceScore)}`);
  lines.push(`- Accessibility: ${scoreLabel(run.accessibilityScore)}`);
  lines.push(`- Best Practices: ${scoreLabel(run.bestPracticesScore)}`);
  lines.push(`- SEO: ${scoreLabel(run.seoScore)}`);

  lines.push("");
  lines.push("## Core Web Vitals");
  // Thresholds: LCP good<2500ms needs<4000ms, INP good<200ms needs<500ms, TBT good<200ms needs<600ms,
  // CLS good<0.1 needs<0.25, FCP good<1800ms needs<3000ms, TTFB good<800ms needs<1800ms
  lines.push(`- LCP: ${metricLabel(run.lcp, "ms", 2500, 4000)}`);
  lines.push(`- INP: ${metricLabel(run.inp, "ms", 200, 500)}`);
  lines.push(`- TBT: ${metricLabel(run.tbt, "ms", 200, 600)}`);
  lines.push(`- CLS: ${metricLabel(run.cls, "", 0.1, 0.25)}`);
  lines.push(`- FCP: ${metricLabel(run.fcp, "ms", 1800, 3000)}`);
  lines.push(`- TTFB: ${metricLabel(run.ttfb, "ms", 800, 1800)}`);

  const alerts = run.regressionAlerts ?? [];
  if (alerts.length > 0) {
    lines.push("");
    lines.push("## Regression Alerts (vs. Baseline)");
    for (const alert of alerts) {
      const causes = Array.isArray(alert.likelyCauses) ? alert.likelyCauses : [];
      const topCause = causes[0] as { title?: string } | undefined;
      const causeNote = topCause?.title ? ` — likely cause: "${topCause.title}"` : "";
      lines.push(
        `- **${alert.metricName.toUpperCase()}** [${alert.severity}/${alert.confidence} confidence]: +${alert.percentChange.toFixed(1)}% vs baseline${causeNote}`
      );
    }
  }

  // Top 5 insights sorted by total metricSavings descending
  const topInsights = [...run.insights]
    .map((insight) => {
      const savings =
        insight.metricSavings !== null &&
        typeof insight.metricSavings === "object" &&
        !Array.isArray(insight.metricSavings)
          ? insight.metricSavings as Record<string, unknown>
          : null;
      const total = savings
        ? Object.values(savings).reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0)
        : 0;
      return { insight, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (topInsights.length > 0) {
    lines.push("");
    lines.push("## Top Improvement Opportunities (by metric savings)");
    for (const { insight, total } of topInsights) {
      const savingsNote = total > 0 ? ` (~${Math.round(total)} ms total savings)` : "";
      lines.push(`- **${insight.title}**${savingsNote}: ${insight.description}`);
      const sources = Array.isArray(insight.sources) ? insight.sources as Array<{ url?: string }> : [];
      if (sources.length > 0) {
        for (const src of sources.slice(0, 3)) {
          if (src.url) lines.push(`  - ${sanitizeForPrompt(src.url, 500)}`);
        }
      }
    }
  }

  const failedAudits = run.audits.filter((a) => a.scored && (a.score === null || a.score < 0.9));
  if (failedAudits.length > 0) {
    lines.push("");
    lines.push("## Failed / Warning Audits");
    for (const audit of failedAudits.slice(0, 10)) {
      const val = audit.displayValue ? ` (${audit.displayValue})` : "";
      lines.push(`- ${audit.title}${val}`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("Based on the data above, provide a concise analysis in **Markdown** with exactly these three sections:");
  lines.push("");
  lines.push("### 1. Executive Summary");
  lines.push("2-3 sentences: overall performance health and the single most critical issue.");
  lines.push("");
  lines.push("### 2. Priority Action Items");
  lines.push("Top 3-5 ordered by impact. For each item, reference the specific resource URL(s) from the insights where relevant. Be concrete and actionable.");
  lines.push("");
  lines.push("### 3. Strengths");
  lines.push("1-3 bullets highlighting metrics or audits that are in the good range.");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Pattern Analysis Prompt
// ---------------------------------------------------------------------------

export interface PatternAlert {
  id: string;
  metricName: string;
  severity: string;
  percentChange: number;
  createdAt: Date;
  likelyCauses: unknown; // JSON array of RootCause objects from regression rules
  run: { completedAt: Date | null };
}

/**
 * Builds the LLM prompt for cross-run regression pattern analysis.
 * Aggregates likelyCauses across multiple RegressionAlert records to surface
 * the dominant root cause pattern for a monitor.
 *
 * Output format: exactly four Markdown sections.
 * Includes a machine-readable `<!-- DOMINANT_CAUSE: <id> -->` footer for parsing.
 */
export function buildPatternAnalysisPrompt(
  alerts: PatternAlert[],
  siteName: string,
  siteUrl: string
): string {
  const lines: string[] = [];

  const safeSiteName = sanitizeForPrompt(siteName);
  const safeSiteUrl = sanitizeForPrompt(siteUrl);

  lines.push(
    `You are a senior web performance engineer analyzing a recurring regression pattern for **${safeSiteName}** (${safeSiteUrl}).`
  );
  lines.push(
    `The following ${alerts.length} regression alerts were detected over the past 90 days:`
  );
  lines.push("");

  // Timeline of incidents
  lines.push("## Regression Timeline");
  for (const alert of alerts) {
    const date = alert.run.completedAt
      ? alert.run.completedAt.toISOString().split("T")[0]
      : "unknown date";
    lines.push(
      `- [${date}] **${alert.metricName.toUpperCase()}** — ${alert.severity} severity, +${alert.percentChange.toFixed(1)}% vs baseline`
    );
  }

  // Cause frequency analysis
  lines.push("");
  lines.push("## Root Cause Frequency");

  const causeFrequency: Record<string, { count: number; title: string }> = {};
  for (const alert of alerts) {
    const causes = Array.isArray(alert.likelyCauses) ? alert.likelyCauses : [];
    for (const cause of causes as Array<{ id?: string; title?: string }>) {
      if (cause.id && cause.title) {
        if (!causeFrequency[cause.id]) {
          causeFrequency[cause.id] = { count: 0, title: cause.title };
        }
        causeFrequency[cause.id].count++;
      }
    }
  }

  const sortedCauses = Object.entries(causeFrequency).sort(
    ([, a], [, b]) => b.count - a.count
  );

  if (sortedCauses.length > 0) {
    for (const [id, { count, title }] of sortedCauses) {
      lines.push(
        `- **${title}** (id: \`${id}\`): appeared in ${count} of ${alerts.length} regressions`
      );
    }
  } else {
    lines.push("- No structured root cause data available.");
  }

  const dominantCauseId =
    sortedCauses.length > 0 ? sortedCauses[0][0] : "unknown";

  // Affected metrics
  const metricCounts: Record<string, number> = {};
  for (const alert of alerts) {
    metricCounts[alert.metricName] = (metricCounts[alert.metricName] ?? 0) + 1;
  }
  lines.push("");
  lines.push("## Affected Metrics");
  for (const [metric, count] of Object.entries(metricCounts)) {
    lines.push(`- **${metric.toUpperCase()}**: ${count} regression(s)`);
  }

  lines.push("");
  lines.push("---");
  lines.push(
    "Based on the data above, provide a concise analysis in **Markdown** with exactly these four sections:"
  );
  lines.push("");
  lines.push("### Pattern Summary");
  lines.push(
    "2-3 sentences describing the overall regression pattern and its business impact."
  );
  lines.push("");
  lines.push("### Recurrence Analysis");
  lines.push(
    "Why this pattern keeps occurring — reference the frequency data above."
  );
  lines.push("");
  lines.push("### Root Cause");
  lines.push(
    "The dominant technical root cause and the specific evidence supporting it."
  );
  lines.push("");
  lines.push("### Recommendation");
  lines.push(
    "One concrete, actionable fix that addresses the root cause. Be specific — name files, tools, or configuration changes where relevant."
  );
  lines.push("");
  lines.push(
    `At the very end of your response, add this machine-readable marker on its own line: <!-- DOMINANT_CAUSE: ${dominantCauseId} -->`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Health Report Prompt
// ---------------------------------------------------------------------------

interface RunForHealthReport extends RunForPrompt {
  speedIndex: number | null;
  tti: number | null;
  totalByteWeight: number | null;
  numRequests: number | null;
  mainThreadWork: number | null;
}

/**
 * Builds the LLM prompt for the first-run site health report.
 * More comprehensive than buildRunAnalysisPrompt — includes all audits and
 * insights (capped at 30/20 respectively for prompt size safety), extra
 * metrics, and produces five structured sections.
 *
 * @param run - The first successful run for a monitor (includes all audits and insights)
 */
export function buildHealthReportPrompt(run: RunForHealthReport): string {
  const url = sanitizeForPrompt(run.finalUrl ?? run.monitor.site.url);
  const strategy = run.monitor.strategy;
  const siteName = sanitizeForPrompt(run.monitor.site.name);

  const lines: string[] = [];

  lines.push(
    `You are a senior web performance engineer conducting an initial site health assessment for **${siteName}** (${url}).`
  );
  lines.push(
    `This is the **first Lighthouse audit** for this site on **${strategy}**. Provide a thorough, actionable report.`
  );

  lines.push("");
  lines.push("## Performance Scores");
  lines.push(`- Performance: ${scoreLabel(run.performanceScore)}`);
  lines.push(`- Accessibility: ${scoreLabel(run.accessibilityScore)}`);
  lines.push(`- Best Practices: ${scoreLabel(run.bestPracticesScore)}`);
  lines.push(`- SEO: ${scoreLabel(run.seoScore)}`);

  lines.push("");
  lines.push("## Core Web Vitals");
  lines.push(`- LCP: ${metricLabel(run.lcp, "ms", 2500, 4000)}`);
  lines.push(`- INP: ${metricLabel(run.inp, "ms", 200, 500)}`);
  lines.push(`- TBT: ${metricLabel(run.tbt, "ms", 200, 600)}`);
  lines.push(`- CLS: ${metricLabel(run.cls, "", 0.1, 0.25)}`);
  lines.push(`- FCP: ${metricLabel(run.fcp, "ms", 1800, 3000)}`);
  lines.push(`- TTFB: ${metricLabel(run.ttfb, "ms", 800, 1800)}`);

  // Extra metrics when available
  const hasExtra =
    run.speedIndex != null ||
    run.tti != null ||
    run.totalByteWeight != null ||
    run.numRequests != null ||
    run.mainThreadWork != null;
  if (hasExtra) {
    lines.push("");
    lines.push("## Additional Metrics");
    if (run.speedIndex != null)
      lines.push(`- Speed Index: ${Math.round(run.speedIndex)} ms`);
    if (run.tti != null)
      lines.push(`- Time to Interactive: ${Math.round(run.tti)} ms`);
    if (run.totalByteWeight != null)
      lines.push(
        `- Total Page Weight: ${Math.round(run.totalByteWeight / 1024)} KB`
      );
    if (run.numRequests != null)
      lines.push(`- Number of Requests: ${run.numRequests}`);
    if (run.mainThreadWork != null)
      lines.push(`- Main Thread Work: ${Math.round(run.mainThreadWork)} ms`);
  }

  // All insights sorted by total metric savings (cap at 20 for prompt size)
  const rankedInsights = [...run.insights]
    .map((insight) => {
      const savings =
        insight.metricSavings !== null &&
        typeof insight.metricSavings === "object" &&
        !Array.isArray(insight.metricSavings)
          ? (insight.metricSavings as Record<string, unknown>)
          : null;
      const total = savings
        ? Object.values(savings).reduce(
            (sum: number, v) => sum + (typeof v === "number" ? v : 0),
            0
          )
        : 0;
      return { insight, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  if (rankedInsights.length > 0) {
    lines.push("");
    lines.push("## Improvement Opportunities (all, by metric savings)");
    for (const { insight, total } of rankedInsights) {
      const savingsNote =
        total > 0 ? ` (~${Math.round(total)} ms total savings)` : "";
      lines.push(
        `- **${insight.title}**${savingsNote}: ${insight.description}`
      );
      const sources = Array.isArray(insight.sources)
        ? (insight.sources as Array<{ url?: string }>)
        : [];
      for (const src of sources.slice(0, 3)) {
        if (src.url) lines.push(`  - ${sanitizeForPrompt(src.url, 500)}`);
      }
    }
  }

  // All audits (scored failures + warnings, cap at 30)
  const allFailedAudits = run.audits
    .filter((a) => a.scored && (a.score === null || a.score < 0.9))
    .slice(0, 30);
  if (allFailedAudits.length > 0) {
    lines.push("");
    lines.push("## Failed / Warning Audits");
    for (const audit of allFailedAudits) {
      const val = audit.displayValue ? ` (${audit.displayValue})` : "";
      lines.push(`- ${audit.title}${val}`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push(
    `This is an **initial health assessment** for a site on **${strategy}**. Provide a comprehensive report in **Markdown** with exactly these five sections:`
  );
  lines.push("");
  lines.push("### Executive Assessment");
  lines.push(
    "3-4 sentences: overall performance maturity, most critical issue, and primary strength."
  );
  lines.push("");
  lines.push("### Quick Wins (Effort vs Impact)");
  lines.push(
    "Top 3 improvements the team can make this week. Sort by effort (low-effort first). For each: state the specific resource URL(s) from the opportunities above where relevant, and estimate the expected metric improvement."
  );
  lines.push("");
  lines.push("### Risk Areas");
  lines.push(
    "2-3 metrics or audit findings that are near their 'Needs Improvement' threshold and could become regressions if ignored."
  );
  lines.push("");
  lines.push("### Monitoring Strategy");
  lines.push(
    `Given this is a ${strategy} audit: recommend whether desktop monitoring is also needed, and suggest an appropriate check frequency (e.g., daily, post-deploy).`
  );
  lines.push("");
  lines.push("### Performance Maturity");
  lines.push(
    "Rate the site's current performance posture on a scale of 1-5 (1=poor, 5=excellent) and explain why, referencing specific scores."
  );

  return lines.join("\n");
}
