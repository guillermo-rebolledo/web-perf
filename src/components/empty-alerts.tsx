import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface EmptyAlertsProps {
  days: number;
}

export function EmptyAlerts({ days }: EmptyAlertsProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Alerts Found</h3>
        <p className="text-sm text-muted-foreground text-center">
          No regression alerts detected in the last {days} day
          {days > 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
