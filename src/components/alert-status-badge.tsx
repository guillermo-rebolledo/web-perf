import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from "@/lib/alert-utils";
import { cn } from "@/lib/utils";

interface AlertStatusBadgeProps {
  status: string;
  className?: string;
}

export function AlertStatusBadge({ status, className }: AlertStatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={cn("flex items-center gap-1", className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
