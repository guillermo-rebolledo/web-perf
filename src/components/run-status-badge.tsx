"use client";

import { Badge } from "@/components/ui/badge";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RunStatus } from "@/types/prisma";

interface RunStatusBadgeProps {
  status: RunStatus;
  className?: string;
}

const statusLabels: Record<RunStatus, string> = {
  [RunStatus.queued]: "Queued",
  [RunStatus.running]: "Running",
  [RunStatus.success]: "Success",
  [RunStatus.failed]: "Failed",
};

/**
 * @deprecated Do not use. This component is deprecated; use run detail status/error UI instead.
 */
export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  const label = statusLabels[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-semibold tracking-tighter text-muted-foreground border-muted",
        className,
      )}
    >
      {status === RunStatus.queued || status === RunStatus.running ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : status === RunStatus.success ? (
        <Check className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 shrink-0" />
      )}
      {label}
    </Badge>
  );
}
