import { cn } from "@/lib/utils";
import {
  Activity,
  LayoutDashboard,
  History,
  AlertTriangle,
  Settings2,
  Clock,
  ChevronsUpDown,
  Eye,
  CircleDot,
  CircleOff,
  CircleCheck,
  CalendarDays,
  Zap,
} from "lucide-react";

const INNER_W = 960;
const INNER_H = 596;
const SCALE = 680 / INNER_W;

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: History, label: "Run History" },
  { icon: AlertTriangle, label: "Regression Alerts", badge: "4", active: true },
  { icon: Settings2, label: "Settings" },
];

// Matches the actual AlertCard structure: severity badge, confidence badge, status badge,
// site name, url, metric/delta/pct data grid, timestamp + actions
interface MockAlert {
  metric: string;
  severity: "critical" | "moderate" | "minor";
  confidence: "High" | "Medium";
  status: "open" | "acknowledged" | "resolved";
  site: string;
  url: string;
  delta: string;
  pct: string;
  ago: string;
}

const ALERTS: MockAlert[] = [
  { metric: "LCP", severity: "critical", confidence: "High", status: "open", site: "Dashboard", url: "dashboard.example.com", delta: "+1,192", pct: "+38.2%", ago: "3 min ago" },
  { metric: "FCP", severity: "moderate", confidence: "High", status: "acknowledged", site: "Shop", url: "shop.example.com", delta: "+420", pct: "+22.4%", ago: "1 hr ago" },
  { metric: "CLS", severity: "minor", confidence: "Medium", status: "resolved", site: "Blog", url: "blog.example.com", delta: "+0.083", pct: "+41.5%", ago: "2 days ago" },
];

const severityBadge = {
  critical: "bg-destructive/10 text-destructive",
  moderate: "bg-score-warning/10 text-score-warning",
  minor: "bg-muted text-muted-foreground",
};
const severityLabel = { critical: "Critical Severity", moderate: "Moderate Severity", minor: "Minor Severity" };
const confidenceBadge = "bg-muted text-muted-foreground";

const statusBadge = {
  open: "bg-destructive/10 text-destructive",
  acknowledged: "bg-score-warning/10 text-score-warning",
  resolved: "bg-score-good/10 text-score-good",
};
const statusLabel = { open: "Open", acknowledged: "Acknowledged", resolved: "Resolved" };

// Left-border colour per severity, matching the actual AlertCard
const cardBorder = {
  critical: "border-l-destructive",
  moderate: "border-l-score-warning",
  minor: "border-l-score-good",
};

// Stat cards matching the real alerts page (xl:grid-cols-5)
const STATS = [
  { label: "Total Alerts (30d)", value: "12", border: "border-primary/40", valueClass: "" },
  { label: "Critical Alerts", value: "4", border: "border-destructive/40", valueClass: "text-destructive" },
  { label: "Open", value: "5", border: "border-muted/60", icon: CircleDot, iconClass: "" },
  { label: "Acknowledged", value: "3", border: "border-score-warning/40", icon: CircleOff, iconClass: "text-score-warning", valueClass: "text-score-warning" },
  { label: "Resolved", value: "4", border: "border-green-500/40", icon: CircleCheck, iconClass: "text-green-600 dark:text-green-400", valueClass: "text-green-600" },
];

// Time-period tabs matching the real page (1d, 3d, 5d, 10d, 30d + Pick Date)
const TIME_TABS = ["1d", "3d", "5d", "10d", "30d"];

interface Props {
  className?: string;
}

export function AlertsPreview({ className }: Props) {
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
            <span className="text-[11px] text-muted-foreground">perflabs.dev/alerts</span>
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
            <div className="flex-1 overflow-hidden p-6 flex flex-col gap-5">
              {/* Page header */}
              <div>
                <h1 className="text-2xl font-bold tracking-tighter">Regression Alerts</h1>
                <p className="text-sm text-muted-foreground tracking-tight -mt-0.5">
                  Performance regressions detected across your monitored sites
                </p>
              </div>

              {/* 5 Summary stat cards — matches xl:grid-cols-5 */}
              <div className="grid grid-cols-5 gap-3">
                {STATS.map(({ label, value, border, valueClass, icon: Icon, iconClass }) => (
                  <div key={label} className={cn("bg-card rounded-lg border-0 border-l-4 shadow-sm", border)}>
                    <div className="px-3 pt-3 pb-1.5">
                      <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        {Icon && <Icon className={cn("size-3", iconClass)} />}
                        {label}
                      </div>
                    </div>
                    <div className="px-3 pb-3 flex items-end justify-between">
                      <div className={cn("text-2xl font-bold", valueClass)}>{value}</div>
                      <Eye className="size-3.5 text-muted-foreground/40" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Time-period tabs — matches the actual TabsList grid-cols-6 */}
              <div className="flex items-center">
                <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                  {TIME_TABS.map((t, i) => (
                    <div
                      key={t}
                      className={cn(
                        "px-3 h-8 flex items-center font-medium",
                        i !== TIME_TABS.length - 1 && "border-r border-border",
                        t === "5d" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t}
                    </div>
                  ))}
                  <div className="px-3 h-8 flex items-center gap-1 font-medium text-muted-foreground border-l border-border">
                    <CalendarDays className="size-3" />
                    Pick Date
                  </div>
                </div>
              </div>

              {/* Alert count + status filter (from AlertsList) */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                  <Zap className="size-3.5 text-secondary" />
                  3 alerts in the last 5 days
                </div>
                <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                  {["All", "Open", "Acknowledged", "Resolved"].map((s, i) => (
                    <div
                      key={s}
                      className={cn(
                        "px-3 h-7 flex items-center font-medium",
                        i !== 3 && "border-r border-border",
                        s === "All" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert cards — matching the actual AlertCard layout */}
              <div className="grid grid-cols-3 gap-3">
                {ALERTS.map((alert) => (
                  <div
                    key={`${alert.url}-${alert.metric}`}
                    className={cn(
                      "bg-card rounded-lg border border-border border-l-4 shadow-sm",
                      cardBorder[alert.severity],
                    )}
                  >
                    <div className="px-3 pt-3 pb-2">
                      {/* Badges row — severity + confidence + status */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", severityBadge[alert.severity])}>
                          {severityLabel[alert.severity]}
                        </span>
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", confidenceBadge)}>
                          {alert.confidence} Confidence
                        </span>
                        <span className={cn("ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold", statusBadge[alert.status])}>
                          {statusLabel[alert.status]}
                        </span>
                      </div>
                      {/* Site name + URL */}
                      <div className="font-bold text-xs tracking-tight truncate">{alert.site}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate mb-2">{alert.url}</div>
                      {/* Metric / Delta / % grid — matches the actual 3-col data grid */}
                      <div className="grid grid-cols-3 divide-x divide-border bg-card-muted-background border border-card-muted-border rounded p-1.5 text-xs">
                        <div className="pr-2">
                          <div className="text-[9px] text-muted-foreground">Metric</div>
                          <div className="font-mono font-semibold">{alert.metric}</div>
                        </div>
                        <div className="px-2">
                          <div className="text-[9px] text-muted-foreground">Delta</div>
                          <div className="font-mono font-semibold text-destructive">{alert.delta}</div>
                        </div>
                        <div className="pl-2">
                          <div className="text-[9px] text-muted-foreground">% Change</div>
                          <div className="font-mono font-semibold text-destructive">{alert.pct}</div>
                        </div>
                      </div>
                    </div>
                    {/* Footer — timestamp + actions */}
                    <div className="px-3 pb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {alert.ago}
                      </div>
                      <span className="text-primary font-medium">View details →</span>
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
