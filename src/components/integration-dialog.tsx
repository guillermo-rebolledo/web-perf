"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IntegrationItem, MonitorOption } from "@/types/api";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  webhookUrl: z.string().url("Enter a valid Slack webhook URL"),
  scope: z.enum(["all", "specific"]),
  monitorIds: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitors: MonitorOption[];
  editItem?: IntegrationItem | null;
  onSaved: (item: IntegrationItem) => void;
}

export function IntegrationDialog({ open, onOpenChange, monitors, editItem, onSaved }: Props) {
  const isEdit = !!editItem;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editItem?.name ?? "",
      webhookUrl: "",
      scope: (editItem?.monitorCount ?? 0) > 0 ? "specific" : "all",
      monitorIds: [],
    },
  });

  const scope = watch("scope");
  const selectedIds = watch("monitorIds");

  function toggleMonitor(id: string) {
    if (selectedIds.includes(id)) {
      setValue("monitorIds", selectedIds.filter((m) => m !== id));
    } else {
      setValue("monitorIds", [...selectedIds, id]);
    }
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    try {
      const body = {
        name: data.name,
        type: "slack",
        webhookUrl: data.webhookUrl,
        monitorIds: data.scope === "specific" ? data.monitorIds : [],
      };

      const url = isEdit ? `/api/integrations/${editItem.id}` : "/api/integrations";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to save integration");
      }

      const responseData = (await res.json()) as { integration: IntegrationItem };
      onSaved(responseData.integration);
      reset();
      onOpenChange(false);
    } catch (err) {
      // bubble up — caller shows toast
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Integration" : "Add Slack Integration"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your Slack notification settings."
              : "Send audit results to a Slack channel via an Incoming Webhook."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="int-name">Name</Label>
            <Input
              id="int-name"
              placeholder="e.g. Slack #perf-alerts"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="int-webhook">Slack Webhook URL</Label>
            <Input
              id="int-webhook"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              {...register("webhookUrl")}
            />
            {errors.webhookUrl && (
              <p className="text-xs text-destructive">{errors.webhookUrl.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Create an Incoming Webhook in your Slack workspace and paste the URL here.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Monitor scope</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setValue("scope", v as "all" | "specific")}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all" className="font-normal cursor-pointer">
                  All monitors
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="specific" id="scope-specific" />
                <Label htmlFor="scope-specific" className="font-normal cursor-pointer">
                  Specific monitors
                </Label>
              </div>
            </RadioGroup>
          </div>

          {scope === "specific" && monitors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 space-y-1">
              {monitors.map((m) => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted text-sm">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleMonitor(m.id)}
                    className="accent-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          )}

          {scope === "specific" && monitors.length === 0 && (
            <p className="text-xs text-muted-foreground">No monitors found.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Integration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
