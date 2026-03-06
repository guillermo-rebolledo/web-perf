"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  initialEnabled: boolean;
}

export function DigestToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

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
            Weekly performance summary sent every Monday at 9 AM UTC.
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
