/** Format milliseconds: "1,234 ms" */
export function formatMs(ms: number | null): string {
  if (ms === null) return "–";
  return `${Math.round(ms).toLocaleString()} ms`;
}

/** Format CLS score: fixed 3 decimal places */
export function formatCls(cls: number | null): string {
  if (cls === null) return "–";
  return cls.toFixed(3);
}

/** Return ink color name for a Lighthouse score (0-100) */
export function scoreColor(score: number | null): string {
  if (score === null) return "gray";
  if (score >= 90) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

/** Format cadence: "every 1d", "every 12h", "every 30min" */
export function formatCadence(minutes: number): string {
  if (minutes % 1440 === 0) return `every ${minutes / 1440}d`;
  if (minutes % 60 === 0) return `every ${minutes / 60}h`;
  return `every ${minutes}min`;
}

/** Format a future ISO date as a relative string: "in 2h", "in 45m", "overdue" */
export function formatRelative(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return "overdue";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(diff / 86_400_000);
  return `in ${days}d`;
}

/** Return ink color name for a regression severity */
export function severityColor(severity: string): string {
  if (severity === "critical") return "red";
  if (severity === "moderate") return "yellow";
  return "gray";
}
