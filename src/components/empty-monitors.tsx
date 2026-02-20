import { Button } from "@/components/ui/button";
import { MonitorForm } from "@/components/monitor-form";
import { Activity } from "lucide-react";

export function EmptyMonitors({ siteId }: { siteId: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      <span className="p-4 rounded-2xl bg-muted flex items-center justify-center">
        <Activity className="h-12 w-12 text-muted-foreground/50" />
      </span>
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold">
          No monitors set up for this site
        </h3>
        <p className="text-sm text-muted-foreground">
          Monitors allow you to schedule automated performance checks and
          compare with previous runs.
        </p>
      </div>
      <MonitorForm
        siteId={siteId}
        triggerButton={<Button>Create First Monitor</Button>}
      />
    </div>
  );
}
