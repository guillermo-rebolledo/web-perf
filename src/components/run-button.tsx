"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";

interface RunButtonProps {
  monitorId: string;
}

export function RunButton({ monitorId }: RunButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const router = useRouter();

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
            `Rate limit exceeded. ${errorData.remaining} runs remaining today.`
          );
        }
        if (response.status === 409) {
          throw new Error("A run is already in progress for this monitor.");
        }
        throw new Error(errorData.error || "Failed to start run");
      }

      const data = await response.json();
      setRemaining(data.remaining);
      
      // Refresh the page to show the new run
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleRun}
        disabled={isLoading}
        size="sm"
        className="w-fit"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run Now
          </>
        )}
      </Button>
      {remaining !== null && (
        <p className="text-xs text-muted-foreground">
          {remaining} manual runs remaining today
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
