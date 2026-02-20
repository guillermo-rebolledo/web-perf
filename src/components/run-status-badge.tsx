"use client";

import { Badge } from "@/components/ui/badge";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type RunStatus = "queued" | "running" | "success" | "failed";

interface RunStatusBadgeProps {
  status: RunStatus;
  className?: string;
}

const statusLabel: Record<RunStatus, string> = {
  queued: "Queued",
  running: "Running",
  success: "Success",
  failed: "Failed",
};

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  const label = statusLabel[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-semibold tracking-tighter text-muted-foreground border-muted",
        className,
      )}
    >
      {status === "queued" || status === "running" ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : status === "success" ? (
        <Check className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 shrink-0" />
      )}
      {label}
    </Badge>
  );
}
