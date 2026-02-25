import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Diff } from "lucide-react";
import type { DiffSummary } from "@/lib/alert-utils";

interface DiffSummarySectionProps {
  diffSummary: DiffSummary;
}

export function DiffSummarySection({ diffSummary }: DiffSummarySectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-extrabold tracking-tighter flex items-center gap-2">
        <Diff className="size-6 text-primary" />
        Performance Changes
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Network Changes */}
        <Card className="tracking-tighter">
          <CardHeader>
            <CardTitle className="text-lg">Network</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Bytes:</span>
              <span
                className={cn(
                  "font-geist-mono font-semibold",
                  diffSummary.network.totalBytesDelta > 0 && "text-destructive",
                )}
              >
                {diffSummary.network.totalBytesDelta > 0 ? "+" : ""}
                {(diffSummary.network.totalBytesDelta / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requests:</span>
              <span
                className={cn(
                  "font-geist-mono font-semibold",
                  diffSummary.network.requestCountDelta > 0 &&
                    "text-destructive",
                )}
              >
                {diffSummary.network.requestCountDelta > 0 ? "+" : ""}
                {diffSummary.network.requestCountDelta}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">JavaScript:</span>
              <span
                className={cn(
                  "font-geist-mono font-semibold",
                  diffSummary.network.jsBytesDelta > 0 && "text-destructive",
                )}
              >
                {diffSummary.network.jsBytesDelta > 0 ? "+" : ""}
                {(diffSummary.network.jsBytesDelta / 1024).toFixed(1)} KB
              </span>
            </div>
            {diffSummary.network.newDomains &&
              diffSummary.network.newDomains.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="text-muted-foreground mb-1">New Domains:</div>
                  {diffSummary.network.newDomains.map((domain: string) => (
                    <div key={domain} className="text-xs text-destructive">
                      • {domain}
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Main Thread Changes */}
        <Card className="tracking-tighter">
          <CardHeader>
            <CardTitle className="text-lg">Main Thread</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Work:</span>
              <span
                className={cn(
                  "font-geist-mono font-semibold",
                  diffSummary.mainThread.totalMainThreadTimeDelta > 0 &&
                    "text-destructive",
                )}
              >
                {diffSummary.mainThread.totalMainThreadTimeDelta > 0 ? "+" : ""}
                {diffSummary.mainThread.totalMainThreadTimeDelta.toFixed(0)} ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scripting Time:</span>
              <span
                className={cn(
                  "font-geist-mono font-semibold",
                  diffSummary.mainThread.scriptingTimeDelta > 0 &&
                    "text-destructive",
                )}
              >
                {diffSummary.mainThread.scriptingTimeDelta > 0 ? "+" : ""}
                {diffSummary.mainThread.scriptingTimeDelta.toFixed(0)} ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Long Tasks:</span>
              <span
                className={cn(
                  "font-geist-mono font-semibold",
                  diffSummary.mainThread.longTaskCountDelta > 0 &&
                    "text-destructive",
                )}
              >
                {diffSummary.mainThread.longTaskCountDelta > 0 ? "+" : ""}
                {diffSummary.mainThread.longTaskCountDelta}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Rendering Changes */}
        <Card className="tracking-tighter">
          <CardHeader>
            <CardTitle className="text-lg">Rendering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                LCP Resource Changed:
              </span>
              <span
                className={cn(
                  "font-semibold",
                  diffSummary.rendering.lcpResourceChanged &&
                    "text-destructive",
                )}
              >
                {diffSummary.rendering.lcpResourceChanged ? "Yes" : "No"}
              </span>
            </div>
            {diffSummary.rendering.lcpResourceChanged && (
              <div className="text-xs space-y-1 pt-2 border-t border-border">
                <div>
                  <span className="text-muted-foreground">Before:</span>
                  <div className="truncate">
                    {diffSummary.rendering.lcpResourceBefore || "Unknown"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">After:</span>
                  <div className="truncate">
                    {diffSummary.rendering.lcpResourceAfter || "Unknown"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backend Changes */}
        <Card className="tracking-tighter">
          <CardHeader>
            <CardTitle className="text-lg">Backend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">TTFB:</span>
              <span
                className={cn(
                  "font-geist-mono font-semibold",
                  diffSummary.backend.ttfbDelta > 0 && "text-destructive",
                )}
              >
                {diffSummary.backend.ttfbDelta > 0 ? "+" : ""}
                {diffSummary.backend.ttfbDelta.toFixed(0)} ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Server Latency:</span>
              <span
                className={cn(
                  "font-geist-mono font-semibold",
                  diffSummary.backend.serverLatencyDelta > 0 &&
                    "text-destructive",
                )}
              >
                {diffSummary.backend.serverLatencyDelta > 0 ? "+" : ""}
                {diffSummary.backend.serverLatencyDelta.toFixed(0)} ms
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
