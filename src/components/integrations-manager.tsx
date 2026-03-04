"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Zap, Pencil, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IntegrationDialog } from "@/components/integration-dialog";
import type { IntegrationItem, MonitorOption } from "@/types/api";

interface Props {
  initialIntegrations: IntegrationItem[];
  monitors: MonitorOption[];
}

export function IntegrationsManager({ initialIntegrations, monitors }: Props) {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(initialIntegrations);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<IntegrationItem | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  function openCreate() {
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(item: IntegrationItem) {
    setEditItem(item);
    setDialogOpen(true);
  }

  function handleSaved(item: IntegrationItem) {
    setIntegrations((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
    toast.success(editItem ? "Integration updated" : "Integration added");
  }

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`/api/integrations/${id}/test`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success("Test message sent — check your Slack channel!");
      } else {
        toast.error(`Test failed: ${data.error ?? "Unknown error"}`);
      }
    } catch {
      toast.error("Failed to send test message");
    } finally {
      setTesting(null);
    }
  }

  async function handleToggle(item: IntegrationItem) {
    setToggling(item.id);
    try {
      const res = await fetch(`/api/integrations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setIntegrations((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i)),
      );
    } catch {
      toast.error("Failed to update integration");
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/integrations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      toast.success("Integration removed");
    } catch {
      toast.error("Failed to remove integration");
    } finally {
      setDeleting(null);
    }
  }

  const hasMonitors = monitors.length > 0;
  const noMonitorsReason = "You need at least one monitor before setting up notifications.";

  return (
    <TooltipProvider>
      <>
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Receive Slack notifications after every audit completes.
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button size="sm" disabled={!hasMonitors} onClick={openCreate}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Integration
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasMonitors && (
                <TooltipContent side="left">{noMonitorsReason}</TooltipContent>
              )}
            </Tooltip>
          </div>

          {integrations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <Zap className="h-8 w-8 text-muted-foreground/40" />
              {hasMonitors ? (
                <>
                  <p className="text-sm text-muted-foreground">No integrations yet.</p>
                  <Button variant="outline" size="sm" onClick={openCreate}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Slack integration
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">No monitors yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Add a site and create a monitor first. Once you have at least one monitor
                    running, you can connect a Slack channel here.
                  </p>
                </>
              )}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.monitorCount === 0
                      ? "All monitors"
                      : `${item.monitorCount} monitor${item.monitorCount === 1 ? "" : "s"}`}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.isActive}
                      disabled={toggling === item.id}
                      onCheckedChange={() => void handleToggle(item)}
                      aria-label={item.isActive ? "Disable integration" : "Enable integration"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={testing === item.id}
                        onClick={() => void handleTest(item.id)}
                        title="Send test message"
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        <span className="sr-only">Test</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                        title="Edit integration"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting === item.id}
                        onClick={() => void handleDelete(item.id)}
                        title="Remove integration"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>

        <IntegrationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          monitors={monitors}
          editItem={editItem}
          onSaved={handleSaved}
        />
      </>
    </TooltipProvider>
  );
}
