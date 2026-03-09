import { cn } from "@/lib/utils";
import {
  Activity,
  LayoutDashboard,
  History,
  AlertTriangle,
  Settings2,
  Clock,
  ChevronsUpDown,
  Plus,
  Smartphone,
} from "lucide-react";

const INNER_W = 960;
const INNER_H = 596;
const SCALE = 680 / INNER_W;

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: History, label: "Run History" },
  { icon: AlertTriangle, label: "Regression Alerts", badge: "2" },
  { icon: Settings2, label: "Settings" },
];

type ScoreVariant = "good" | "warning" | "poor";

const scoreText: Record<ScoreVariant, string> = {
  good: "text-score-good",
  warning: "text-score-warning",
  poor: "text-score-poor",
};

function scoreVariant(v: number): ScoreVariant {
  return v >= 90 ? "good" : v >= 50 ? "warning" : "poor";
}

interface MockSite {
  name: string;
  url: string;
  perf: number;
  a11y: number;
  seo: number;
  bp: number;
  strategy: "mobile" | "desktop";
  ago: string;
}

const SITES: MockSite[] = [
  { name: "Dashboard", url: "dashboard.example.com", perf: 47, a11y: 98, seo: 100, bp: 91, strategy: "mobile", ago: "3 min ago" },
  { name: "Shop", url: "shop.example.com", perf: 72, a11y: 95, seo: 98, bp: 91, strategy: "mobile", ago: "1 hr ago" },
  { name: "Blog", url: "blog.example.com", perf: 88, a11y: 97, seo: 99, bp: 91, strategy: "mobile", ago: "2 hr ago" },
  { name: "API Docs", url: "api.example.com", perf: 91, a11y: 100, seo: 96, bp: 100, strategy: "desktop", ago: "3 hr ago" },
  { name: "Docs", url: "docs.example.com", perf: 65, a11y: 94, seo: 100, bp: 83, strategy: "mobile", ago: "4 hr ago" },
  { name: "Checkout", url: "checkout.example.com", perf: 58, a11y: 96, seo: 99, bp: 91, strategy: "mobile", ago: "5 hr ago" },
];

interface Props {
  className?: string;
}

export function DashboardPreview({ className }: Props) {
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
            <span className="text-[11px] text-muted-foreground">perflabs.dev/dashboard</span>
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
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="text-xs bg-destructive/15 text-destructive rounded-full px-1.5 font-semibold">
                      {badge}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* User footer */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-medium shrink-0">
                  J
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">John Doe</div>
                  <div className="text-[10px] text-muted-foreground truncate">john@example.com</div>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden p-6 flex flex-col gap-6">
              {/* Page header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tighter">Web Performance Lab</h1>
                  <p className="text-sm text-muted-foreground tracking-tight -mt-0.5">
                    Monitor and analyze your website performance
                  </p>
                </div>
                <div className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                  <Plus className="size-3.5" />
                  Add Site
                </div>
              </div>

              {/* Site card grid */}
              <div className="grid grid-cols-3 gap-5">
                {SITES.map((site) => (
                  <div key={site.url} className="bg-card rounded-lg border border-border shadow-sm flex flex-col overflow-hidden">
                    {/* Card header */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="font-semibold text-sm tracking-tight truncate">{site.name}</div>
                      <div className="text-[10px] text-muted-foreground/70 font-mono truncate">{site.url}</div>
                    </div>
                    <div className="h-px bg-border mx-0" />
                    {/* Metrics row */}
                    <div className="px-4 py-2.5 grid grid-cols-4 gap-2">
                      {[
                        { label: "Perf.", value: site.perf },
                        { label: "A11y", value: site.a11y },
                        { label: "SEO", value: site.seo },
                        { label: "Best Pr.", value: site.bp },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                          <span className={cn("text-xs font-bold font-mono tabular-nums", scoreText[scoreVariant(value)])}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-border mx-0" />
                    {/* Footer */}
                    <div className="px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <div className="flex items-center gap-1 border border-border rounded px-1.5 py-0.5">
                        <Smartphone className="size-2.5" />
                        <span className="capitalize">{site.strategy}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {site.ago}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
