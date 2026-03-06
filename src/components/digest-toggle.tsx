"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  initialEnabled: boolean;
}

/**
 * Returns "Monday at 9:00 AM UTC · Tuesday at 7:00 PM in your timezone"
 * (or omits the local part if the browser timezone is UTC).
 * The day label is included when the local day differs from Monday.
 */
function formatScheduleHint(): string {
  const utcLabel = "Monday at 9:00 AM UTC";

  try {
    // Anchor to a known Monday at 09:00 UTC — 2 Mar 2026 is a Monday.
    const ref = new Date("2026-03-02T09:00:00Z");
    const localTime = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(ref);

    // If the formatted string already contains "UTC" the timezone IS UTC —
    // no point showing the same time twice.
    if (localTime.includes("UTC")) return utcLabel;

    return `${utcLabel} · ${localTime} in your timezone`;
  } catch {
    return utcLabel;
  }
}

export function DigestToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const scheduleHint = formatScheduleHint();

  async function handleToggle(checked: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyDigestEnabled: checked }),
      });
      if (!res.ok) throw new Error("Failed to update preference");
      setEnabled(checked);
      toast.success(
        checked ? "Weekly digest enabled" : "Weekly digest disabled"
      );
    } catch {
      toast.error("Could not save preference. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="digest-toggle" className="text-sm font-medium">
            Email Digest
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Weekly performance summary sent every {scheduleHint}.
          </p>
        </div>
        <Switch
          id="digest-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading}
          aria-label="Toggle weekly email digest"
        />
      </div>
    </div>
  );
}
