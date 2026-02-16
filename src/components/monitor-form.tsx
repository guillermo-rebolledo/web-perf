"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const monitorSchema = z.object({
  siteId: z.string(),
  cadenceMinutes: z.number().int().min(30).max(43200),
  strategy: z.enum(["mobile", "desktop"]),
  isActive: z.boolean(),
});

type MonitorFormData = z.infer<typeof monitorSchema>;

interface MonitorFormProps {
  siteId: string;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export function MonitorForm({
  siteId,
  onSuccess,
  triggerButton,
}: MonitorFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<MonitorFormData>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      siteId,
      cadenceMinutes: 1440,
      strategy: "mobile",
      isActive: true,
    },
  });

  const cadenceMinutes = watch("cadenceMinutes");
  const strategy = watch("strategy");
  const isActive = watch("isActive");

  const onSubmit = async (data: MonitorFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create monitor");
      }

      reset();
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || <Button>Create Monitor</Button>}
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Create Monitor</DialogTitle>
          <DialogDescription>
            Configure how often and how to audit this site.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Cadence</Label>
              <Select
                value={cadenceMinutes.toString()}
                onValueChange={(value) =>
                  setValue("cadenceMinutes", parseInt(value, 10))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="360">Every 6 hours</SelectItem>
                  <SelectItem value="720">Every 12 hours</SelectItem>
                  <SelectItem value="1440">Every 24 hours</SelectItem>
                  <SelectItem value="10080">Every week</SelectItem>
                </SelectContent>
              </Select>
              {errors.cadenceMinutes && (
                <p className="text-sm text-destructive">
                  {errors.cadenceMinutes.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Strategy</Label>
              <Select
                value={strategy}
                onValueChange={(value: "mobile" | "desktop") =>
                  setValue("strategy", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                </SelectContent>
              </Select>
              {errors.strategy && (
                <p className="text-sm text-destructive">
                  {errors.strategy.message}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setValue("isActive", checked)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Monitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
