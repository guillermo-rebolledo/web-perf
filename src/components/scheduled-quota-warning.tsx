"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ScheduledQuotaWarning() {
  useEffect(() => {
    let cancelled = false;

    async function checkQuota() {
      try {
        const response = await fetch("/api/quota");
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const scheduled = data.scheduled;
        if (!cancelled && scheduled && !scheduled.success) {
          toast.warning("Scheduled monitoring paused for today", {
            description: `You've used all ${scheduled.limit} scheduled runs for today. Monitoring resumes automatically at midnight.`,
          });
        }
      } catch {
        // Fail silently — don't alarm users on a network hiccup
      }
    }

    void checkQuota();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
