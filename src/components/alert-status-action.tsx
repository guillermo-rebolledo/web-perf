"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings2, Loader2, ArrowLeft } from "lucide-react";
import { getStatusTransitions, getStatusConfig, type AlertStatus } from "@/lib/alert-utils";
import { AlertStatusBadge } from "@/components/alert-status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<AlertStatus | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const transitions = getStatusTransitions(currentStatus);

  if (transitions.length === 0) return null;

  function reset() {
    setSelectedTransition(null);
    setNote("");
  }

  async function handleConfirm() {
    if (!selectedTransition) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/regressions/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedTransition,
          ...(note.trim() && { notes: note.trim() }),
        }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update status");
      }

      const { alert: updated } = await res.json();
      onUpdate(updated);
      toast.success(`Alert ${getStatusConfig(selectedTransition).label.toLowerCase()}`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <SheetTrigger asChild>
        {size === "compact" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs gap-1"
          >
            Actions
            <Settings2 className="h-3 w-3" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5">
            Actions
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col" onClick={(e) => e.stopPropagation()}>
        <SheetHeader>
          <SheetTitle className="tracking-tight">Alert Actions</SheetTitle>
          <SheetDescription asChild>
            <div className="flex items-center gap-2">
              Current status: <AlertStatusBadge status={currentStatus} />
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 flex-1 pt-4">
          {selectedTransition === null ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Transition to
              </span>
              {transitions.map((t) => {
                const config = getStatusConfig(t.status);
                return (
                  <button
                    key={t.status}
                    type="button"
                    onClick={() => setSelectedTransition(t.status)}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-lg border p-4 text-left transition-colors",
                      "hover:bg-accent hover:border-accent-foreground/20",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <span className={cn("shrink-0", config.color)}>{config.icon}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="text-xs text-muted-foreground">
                        Move this alert to {config.label.toLowerCase()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setSelectedTransition(null); setNote(""); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to actions
              </button>

              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className={getStatusConfig(selectedTransition).color}>
                  {getStatusConfig(selectedTransition).icon}
                </span>
                {transitions.find((t) => t.status === selectedTransition)?.label}
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
                  rows={4}
                  className="text-sm resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedTransition(null); setNote(""); }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirm} disabled={loading}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
