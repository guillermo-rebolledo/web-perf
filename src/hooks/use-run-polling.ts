"use client";

import { useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RunStatus } from "@/types/prisma";

const POLL_INTERVAL_MS = 3000;

export function useRunPolling() {
  const router = useRouter();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runIdRef = useRef<string | null>(null);
  const onSettledRef = useRef<(() => void) | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    runIdRef.current = null;
  }, []);

  const poll = useCallback(async () => {
    const runId = runIdRef.current;
    if (!runId) return;

    try {
      const res = await fetch(`/api/runs/${runId}/status`);
      if (!res.ok) return;

      const data = await res.json();

      if (data.status === RunStatus.success) {
        stopPolling();
        onSettledRef.current?.();
        router.refresh();
        toast.success("Run completed successfully");
      } else if (data.status === RunStatus.failed) {
        stopPolling();
        onSettledRef.current?.();
        router.refresh();
        toast.error(data.errorMessage || "Run failed");
      }
    } catch {
      // Silently ignore poll errors — will retry on next interval
    }
  }, [router, stopPolling]);

  const startPolling = useCallback(
    (runId: string, onSettled?: () => void) => {
      stopPolling();
      runIdRef.current = runId;
      onSettledRef.current = onSettled ?? null;
      pollingRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [poll, stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { startPolling, stopPolling };
}
