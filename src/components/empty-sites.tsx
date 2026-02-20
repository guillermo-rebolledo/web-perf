import { ChartColumn, CirclePlus, Info } from "lucide-react";
import { SiteForm } from "@/components/site-form";
import { Button } from "@/components/ui/button";

export function EmptySites() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      <span className="p-4 rounded-2xl bg-muted flex items-center justify-center">
        <ChartColumn className="h-12 w-12 text-muted-foreground/50" />
      </span>
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold">No sites monitored yet</h3>
        <p className="text-sm text-muted-foreground">
          Add your first website to start tracking performance metrics and
          vitals.
        </p>
      </div>
      <p className="text-xs text-muted-foreground/50 flex items-center gap-1">
        <Info className="h-4 w-4" />
        Takes less than a minute to set up your first monitor.
      </p>
      <SiteForm
        triggerButton={
          <Button>
            <CirclePlus />
            Create Your First Site
          </Button>
        }
      />
    </div>
  );
}
