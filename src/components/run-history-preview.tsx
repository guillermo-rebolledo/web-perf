import { cn } from "@/lib/utils";
import {
  Activity,
  LayoutDashboard,
  History,
  AlertTriangle,
  Settings2,
  ChevronsUpDown,
  Smartphone,
  Gauge,
  Accessibility,
  ShieldCheck,
  Search,
  ArrowUpRight,
} from "lucide-react";

const INNER_W = 960;
const INNER_H = 596;
const SCALE = 680 / INNER_W;

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: History, label: "Run History", active: true },
  { icon: AlertTriangle, label: "Regression Alerts", badge: "2" },
  { icon: Settings2, label: "Settings" },
];

type CwvVariant = "good" | "warning" | "poor";

function scoreVariant(v: number): CwvVariant {
  return v >= 90 ? "good" : v >= 50 ? "warning" : "poor";
}
function cwvVariant(v: number, good: number, ni: number): CwvVariant {
  return v <= good ? "good" : v <= ni ? "warning" : "poor";
}

const variantText: Record<CwvVariant, string> = {
  good: "text-score-good",
  warning: "text-score-warning",
  poor: "text-score-poor",
};
const variantBg: Record<CwvVariant, string> = {
  good: "bg-score-good",
  warning: "bg-score-warning",
  poor: "bg-score-poor",
};
const cwvPill: Record<CwvVariant, string> = {
  good: "bg-score-good/10 text-score-good",
  warning: "bg-score-warning/10 text-score-warning",
  poor: "bg-destructive/10 text-destructive",
};

// The 4 latest-run ScoreCards that appear in HistoryView above the chart
const LATEST = { perf: 47, a11y: 98, bp: 91, seo: 100 };
const AVG = { perf: 74, a11y: 98, bp: 91, seo: 100 };

const SCORE_CARDS = [
  { title: "Performance", icon: Gauge, score: LATEST.perf, avg: AVG.perf },
  { title: "Accessibility", icon: Accessibility, score: LATEST.a11y, avg: AVG.a11y },
  { title: "Best Practices", icon: ShieldCheck, score: LATEST.bp, avg: AVG.bp },
  { title: "SEO", icon: Search, score: LATEST.seo, avg: AVG.seo },
];

// Simplified chart data: perf scores descending (matching the regression narrative)
const CHART_POINTS = [88, 82, 84, 79, 71, 62, 47];

// RunHistoryTable rows
interface Run {
  date: string;
  perf: number;
  acc: number;
  bp: number;
  seo: number;
  lcp: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

const RUNS: Run[] = [
  { date: "Mar 7, 2026 10:42", perf: 47,  acc: 98, bp: 91, seo: 100, lcp: 4312, cls: 0.042, fcp: 2104, ttfb: 412 },
  { date: "Mar 7, 2026 04:42", perf: 62,  acc: 98, bp: 91, seo: 100, lcp: 3100, cls: 0.038, fcp: 1850, ttfb: 380 },
  { date: "Mar 6, 2026 22:42", perf: 71,  acc: 98, bp: 91, seo: 100, lcp: 2800, cls: 0.022, fcp: 1620, ttfb: 340 },
  { date: "Mar 6, 2026 16:42", perf: 84,  acc: 98, bp: 91, seo: 100, lcp: 2200, cls: 0.018, fcp: 1500, ttfb: 290 },
  { date: "Mar 6, 2026 10:42", perf: 82,  acc: 97, bp: 91, seo: 100, lcp: 2350, cls: 0.029, fcp: 1480, ttfb: 310 },
];

function ScorePill({ score }: { score: number }) {
  const v = scoreVariant(score);
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums", cwvPill[v])}>
      {score}
    </span>
  );
}

function CwvPill({ val, good, ni, fmt = (v: number) => `${Math.round(v)}ms` }: {
  val: number; good: number; ni: number; fmt?: (v: number) => string;
}) {
  const v = cwvVariant(val, good, ni);
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums", cwvPill[v])}>
      {fmt(val)}
    </span>
  );
}

interface Props {
  className?: string;
}

export function RunHistoryPreview({ className }: Props) {
  // Build SVG polyline for the performance chart
  const chartW = 580;
  const chartH = 72;
  const maxV = 100;
  const points = CHART_POINTS.map((v, i) => {
    const x = (i / (CHART_POINTS.length - 1)) * chartW;
    const y = chartH - (v / maxV) * chartH;
    return `${x},${y}`;
  }).join(" ");

  // Color zones for the chart backdrop
  const goodY = chartH - (90 / maxV) * chartH;
  const warnY = chartH - (50 / maxV) * chartH;

  return (
    <div className={cn("w-full h-full flex flex-col bg-background", className)}>
      {/* Browser chrome */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex gap-1.5 shrink-0" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 mx-6">
          <div className="mx-auto max-w-48 rounded border border-border/60 bg-background px-3 py-0.5 text-center">
            <span className="text-[11px] text-muted-foreground">perflabs.dev/history</span>
          </div>
        </div>
        <div className="w-[34px] shrink-0" aria-hidden />
      </div>

      {/* Scaled app */}
      <div
        className="flex-1 overflow-hidden pointer-events-none select-none"
        style={{ height: `${INNER_H * SCALE}px` }}
        aria-hidden
      >
        <div
          className="flex bg-background"
          style={{ width: INNER_W, height: INNER_H, transform: `scale(${SCALE})`, transformOrigin: "top left" }}
        >
          {/* Sidebar */}
          <aside className="w-48 shrink-0 flex flex-col border-r border-border bg-sidebar">
            <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                <Activity className="size-4 text-primary" />
              </span>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="text-sm font-semibold">PerfLabs</span>
                <span className="text-[10px] text-muted-foreground">Monitor &amp; Analyze</span>
              </div>
            </div>
            <div className="p-2 flex-1">
              <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Navigation
              </div>
              {NAV.map(({ icon: Icon, label, active, badge }) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm mb-0.5",
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="text-xs bg-destructive/15 text-destructive rounded-full px-1.5 font-semibold">{badge}</span>
                  )}
                </div>
              ))}
            </div>
            {/* User footer */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-medium shrink-0">G</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">Guillermo</div>
                  <div className="text-[10px] text-muted-foreground truncate">gortiz.dev@gmail.com</div>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden p-5 flex flex-col gap-4">
              {/* Page header */}
              <div>
                <h1 className="text-2xl font-bold tracking-tighter">Run History</h1>
                <p className="text-sm text-muted-foreground tracking-tight -mt-0.5">
                  Performance scores and Core Web Vitals over time
                </p>
              </div>

              {/* Filter bar: site select + monitor select + day-range tabs */}
              <div className="flex items-center gap-3">
                {/* Site select */}
                <div className="flex items-center justify-between w-52 h-9 rounded-md border border-border bg-background px-3 text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">Dashboard</span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </div>
                {/* Monitor select */}
                <div className="flex items-center justify-between w-44 h-9 rounded-md border border-border bg-background px-3 text-xs">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <Smartphone className="size-3.5" />
                    Mobile
                  </span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </div>
                {/* Day-range tabs — ml-auto pushes to right */}
                <div className="ml-auto inline-flex rounded-md border border-border overflow-hidden text-xs">
                  {["7d", "14d", "30d"].map((t, i) => (
                    <div
                      key={t}
                      className={cn(
                        "px-4 h-8 flex items-center font-medium",
                        i !== 2 && "border-r border-border",
                        t === "30d" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest-run ScoreCards — grid-cols-4, matching HistoryView */}
              <div>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="text-sm font-semibold">Latest run</span>
                  <span className="text-xs text-muted-foreground">Mar 7, 2026 at 10:42</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {SCORE_CARDS.map(({ title, icon: Icon, score, avg }) => {
                    const v = scoreVariant(score);
                    const avgV = scoreVariant(avg);
                    return (
                      <div key={title} className="bg-card rounded-lg border border-border shadow-sm p-4">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">{title}</span>
                          <Icon className={cn("size-3.5", variantText[v])} />
                        </div>
                        <span className={cn("text-3xl font-extrabold tabular-nums", variantText[v])}>{score}</span>
                        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", variantBg[v])} style={{ width: `${score}%` }} />
                        </div>
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          Period avg: <span className={cn("font-semibold", variantText[avgV])}>{avg}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performance Timeline card */}
              <div className="bg-card rounded-lg border border-border shadow-sm">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">Performance Timeline </span>
                  <span className="text-xs text-muted-foreground font-normal">— last 30 days</span>
                </div>
                <div className="px-4 py-3">
                  <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="none">
                    {/* Zone bands */}
                    <rect x={0} y={0} width={chartW} height={goodY} fill="oklch(0.72 0.17 142 / 0.06)" />
                    <rect x={0} y={goodY} width={chartW} height={warnY - goodY} fill="oklch(0.75 0.16 60 / 0.06)" />
                    <rect x={0} y={warnY} width={chartW} height={chartH - warnY} fill="oklch(0.58 0.22 27 / 0.06)" />
                    {/* Trend line */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke="oklch(0.5144 0.1605 267.44)"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {/* Data points */}
                    {CHART_POINTS.map((v, i) => {
                      const x = (i / (CHART_POINTS.length - 1)) * chartW;
                      const y = chartH - (v / maxV) * chartH;
                      return <circle key={i} cx={x} cy={y} r={3} fill="oklch(0.5144 0.1605 267.44)" />;
                    })}
                  </svg>
                </div>
              </div>

              {/* Run Log card */}
              <div className="bg-card rounded-lg border border-border shadow-sm">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">Run Log </span>
                  <span className="text-xs text-muted-foreground font-normal">({RUNS.length} runs)</span>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {["Date", "Perf", "Acc", "BP", "SEO", "LCP", "CLS ×1k", "FCP", "TTFB", ""].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RUNS.map((run, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-1.5 font-mono text-muted-foreground whitespace-nowrap">{run.date}</td>
                          <td className="px-3 py-1.5"><ScorePill score={run.perf} /></td>
                          <td className="px-3 py-1.5"><ScorePill score={run.acc} /></td>
                          <td className="px-3 py-1.5"><ScorePill score={run.bp} /></td>
                          <td className="px-3 py-1.5"><ScorePill score={run.seo} /></td>
                          <td className="px-3 py-1.5"><CwvPill val={run.lcp} good={2500} ni={4000} /></td>
                          <td className="px-3 py-1.5"><CwvPill val={run.cls} good={0.1} ni={0.25} fmt={(v) => (v * 1000).toFixed(1)} /></td>
                          <td className="px-3 py-1.5"><CwvPill val={run.fcp} good={1800} ni={3000} /></td>
                          <td className="px-3 py-1.5"><CwvPill val={run.ttfb} good={800} ni={1800} /></td>
                          <td className="px-3 py-1.5 text-right">
                            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                              View<ArrowUpRight className="size-2.5" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
