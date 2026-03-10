"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CollapsibleRoot,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ClipboardList, Sparkles } from "lucide-react";
import { formatRelativeTime } from "@/lib/dates";
import { MarkdownSnippet } from "@/components/markdown-snippet";

interface RunHealthReportProps {
  healthReport: string;
  healthReportAt: Date;
}

/**
 * Displays the AI-generated initial site health report for the first run of a monitor.
 * Rendered only when run.isFirstRun is true and run.healthReport is set.
 * Distinct visual treatment from RunAISummary — uses primary palette, not violet.
 * Collapsible — open by default.
 */
export function RunHealthReport({
  healthReport,
  healthReportAt,
}: RunHealthReportProps) {
  const [open, setOpen] = useState(true);

  return (
    <CollapsibleRoot open={open} onOpenChange={setOpen}>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left rounded-md px-1.5 py-1 -ml-1.5 hover:bg-primary/10 transition-colors cursor-pointer group">
                <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                  <ClipboardList className="size-4 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Initial Site Analysis
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs border-primary/30 text-primary"
                >
                  First Run
                </Badge>
                <span className="ml-0.5 flex items-center justify-center rounded border border-border bg-muted/60 p-0.5 group-hover:bg-background transition-colors">
                  <ChevronDown
                    className="size-3 text-muted-foreground transition-transform duration-200 shrink-0"
                    style={{
                      transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  />
                </span>
              </button>
            </CollapsibleTrigger>

            <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1">
              <Sparkles
                className="size-4 text-violet-500 shrink-0"
                fill="currentColor"
              />
              {`Generated ${formatRelativeTime(healthReportAt)}`}
            </span>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <MarkdownSnippet md={healthReport} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </CollapsibleRoot>
  );
}
