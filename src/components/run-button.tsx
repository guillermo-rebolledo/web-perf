"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Loader2, Play } from "lucide-react";
import { useRunPolling } from "@/hooks/use-run-polling";

interface RunButtonProps {
  monitorId: string;
  activeRunId?: string;
}

export function RunButton({ monitorId, activeRunId }: RunButtonProps) {
  const [isLoading, setIsLoading] = useState(!!activeRunId);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const router = useRouter();
  const { startPolling } = useRunPolling();

  // If there's an active run on mount, start polling immediately
  useEffect(() => {
    if (activeRunId) {
      startPolling(activeRunId, () => setIsLoading(false));
    }
  }, [activeRunId, startPolling]);

  const handleRun = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/monitors/${monitorId}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error(
            `Rate limit exceeded. ${errorData.remaining} runs remaining today.`,
          );
        }
        if (response.status === 409) {
          throw new Error("A run is already in progress for this monitor.");
        }
        throw new Error(errorData.error || "Failed to start run");
      }

      const data = await response.json();
      setRemaining(data.remaining);

      // Refresh to show the queued run, then start polling
      router.refresh();
      startPolling(data.runId, () => setIsLoading(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Runs remaining"
              >
                <Info className="size-6" />
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="center"
              className="bg-background text-foreground border border-border shadow-md"
            >
              {remaining !== null
                ? `${remaining} manual runs remaining today`
                : "Manual runs remaining today (run to see quota)"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          onClick={handleRun}
          disabled={isLoading}
          size="sm"
          className="w-fit gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="size-3.5" />
              Run Now
            </>
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
