"use client";

import Link from "next/link";
import { Globe, Monitor, CheckCircle2, XCircle, TrendingDown, GitBranch } from "lucide-react";
import type { ActivityEventRow } from "@/types/api";

type EventMeta = Record<string, unknown>;

function getIcon(type: string) {
  switch (type) {
    case "site_created": return Globe;
    case "monitor_created": return Monitor;
    case "run_completed": return CheckCircle2;
    case "run_failed": return XCircle;
    case "regression_detected": return TrendingDown;
    case "deployment_run_triggered": return GitBranch;
    default: return Globe;
  }
}

function getDotColor(type: string): string {
  switch (type) {
    case "site_created": return "bg-blue-500";
    case "monitor_created": return "bg-purple-500";
    case "run_completed": return "bg-green-500";
    case "run_failed": return "bg-destructive";
    case "regression_detected": return "bg-orange-500";
    case "deployment_run_triggered": return "bg-cyan-500";
    default: return "bg-muted-foreground";
  }
}

function getDescription(type: string, meta: EventMeta): string {
  switch (type) {
    case "site_created":
      return `Site "${meta.siteName}" was added (${meta.siteUrl})`;
    case "monitor_created":
      return `Monitor created for "${meta.siteName}" — ${meta.strategy} / ${meta.triggerType}`;
    case "run_completed":
      return `Audit completed for "${meta.siteName}" — score ${meta.performanceScore ?? "n/a"}`;
    case "run_failed":
      return `Audit failed for "${meta.siteName}"${meta.errorMessage ? `: ${meta.errorMessage}` : ""}`;
    case "regression_detected":
      return `${meta.alertCount} regression${Number(meta.alertCount) !== 1 ? "s" : ""} detected on "${meta.siteName}"`;
    case "deployment_run_triggered":
      return `Deployment audit triggered for "${meta.siteName}"${meta.githubBranch ? ` (${meta.githubBranch})` : ""}`;
    default:
      return type;
  }
}

function getEntityHref(event: ActivityEventRow): string {
  const meta = event.metadata as EventMeta;
  switch (event.entityType) {
    case "run":
      return `/runs/${event.entityId}`;
    case "site":
      return `/sites/${event.entityId}`;
    case "monitor":
      return meta.siteId ? `/sites/${meta.siteId as string}` : "/";
    default:
      return "/";
  }
}

function RelativeTime({ dateStr }: { dateStr: string }) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  let relative: string;
  if (diffMins < 1) relative = "just now";
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHrs < 24) relative = `${diffHrs}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else relative = date.toLocaleDateString();

  return (
    <time
      dateTime={dateStr}
      title={date.toLocaleString()}
      className="text-xs text-muted-foreground shrink-0"
    >
      {relative}
    </time>
  );
}

export function ActivityEventCard({ event }: { event: ActivityEventRow }) {
  const meta = event.metadata as EventMeta;
  const Icon = getIcon(event.type);
  const dotColor = getDotColor(event.type);
  const description = getDescription(event.type, meta);
  const href = getEntityHref(event);

  return (
    <div className="flex gap-4 group">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${dotColor} ring-2 ring-background`} />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      {/* Card */}
      <Link
        href={href}
        className="flex-1 mb-4 flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
      >
        <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm">{description}</span>
        <RelativeTime dateStr={event.createdAt} />
      </Link>
    </div>
  );
}
