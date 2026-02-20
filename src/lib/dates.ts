/**
 * Formats a date as a relative time string (e.g. "5 minutes ago", "2 hours ago").
 */
export function formatRelativeTime(
  date: Date | string,
  now: Date = new Date(),
): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) === 1 ? "" : "s"} ago`;
}

export function formatCadence(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (minutes < 1440 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "hour" : `${hours} hours`;
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    if (days === 1) return "day";
    if (days === 7) return "week";
    if (days === 30) return "month";
    return `${days} days`;
  }
  return `${minutes} minutes`;
}
