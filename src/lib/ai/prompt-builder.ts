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
  const url = run.finalUrl ?? run.monitor.site.url;
  const strategy = run.monitor.strategy;
  const siteName = run.monitor.site.name;

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
          if (src.url) lines.push(`  - ${src.url}`);
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
