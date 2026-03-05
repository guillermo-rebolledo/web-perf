"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, Loader2 } from "lucide-react";
import { getStatusTransitions, getStatusConfig, type AlertStatus } from "@/lib/alert-utils";
import { toast } from "sonner";

interface AlertStatusActionProps {
  alertId: string;
  currentStatus: string;
  size?: "compact" | "full";
  onUpdate: (updatedAlert: { id: string; status: string; notes: string | null }) => void;
}

export function AlertStatusAction({
  alertId,
  currentStatus,
  size = "compact",
  onUpdate,
}: AlertStatusActionProps) {
  const [pendingTransition, setPendingTransition] = useState<AlertStatus | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const transitions = getStatusTransitions(currentStatus);

  if (transitions.length === 0) return null;

  async function handleConfirm() {
    if (!pendingTransition) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/regressions/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: pendingTransition,
          ...(note.trim() && { notes: note.trim() }),
        }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update status");
      }

      const { alert: updated } = await res.json();
      onUpdate(updated);
      toast.success(`Alert ${getStatusConfig(pendingTransition).label.toLowerCase()}`);
      setOpen(false);
      setNote("");
      setPendingTransition(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(status: AlertStatus) {
    setPendingTransition(status);
    setOpen(true);
  }

  const trigger =
    size === "compact" ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1"
        onClick={(e) => e.preventDefault()}
      >
        Actions
        <ChevronDown className="h-3 w-3" />
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="gap-1.5">
        Change Status
        <ChevronDown className="h-4 w-4" />
      </Button>
    );

  return (
    <Popover open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setPendingTransition(null); setNote(""); } }}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
          {transitions.map((t) => (
            <DropdownMenuItem
              key={t.status}
              onSelect={() => handleSelect(t.status)}
            >
              <span className="flex items-center gap-2">
                {getStatusConfig(t.status).icon}
                {t.label}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden trigger for popover — positioned offscreen; we control open state */}
      <PopoverTrigger asChild>
        <span className="sr-only" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 flex flex-col gap-3" align="end">
        <div className="text-sm font-semibold">
          {pendingTransition && getStatusTransitions(currentStatus).find((t) => t.status === pendingTransition)?.label}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`note-${alertId}`} className="text-xs text-muted-foreground">
            Note (optional)
          </Label>
          <Textarea
            id={`note-${alertId}`}
            placeholder='e.g. "Fixed in deploy abc123"'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setOpen(false); setPendingTransition(null); setNote(""); }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
