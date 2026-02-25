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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Calendar,
  Clock,
  Monitor,
  MonitorSmartphone,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import posthog from "posthog-js";
import { AnalyticsEvent } from "@/lib/analytics-events";

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

const cadenceLabels: Record<number, string> = {
  30: "30 minutes",
  60: "1 hour",
  360: "6 hours",
  720: "12 hours",
  1440: "24 hours",
  10080: "1 week",
  43200: "1 month",
};

const strategies = [
  {
    value: "mobile" as const,
    label: "Mobile",
    description: "Test with a simulated mobile device",
    icon: Smartphone,
  },
  {
    value: "desktop" as const,
    label: "Desktop",
    description: "Test with a desktop viewport",
    icon: Monitor,
  },
];

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

      posthog.capture(AnalyticsEvent.monitor_add, {
        monitor_site: siteId,
        monitor_cadence: data.cadenceMinutes,
        monitor_strategy: data.strategy,
      });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Audit Monitor</DialogTitle>
          <DialogDescription>
            Set up automated performance tracking for Core Web Vitals and
            PageSpeed Insights to catch regressions before they hit production.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1">
                <Calendar className="size-4" /> Scan Frequency
              </Label>
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
                  <SelectItem value="43200">Every month</SelectItem>
                </SelectContent>
              </Select>
              {errors.cadenceMinutes && (
                <p className="text-sm text-destructive">
                  {errors.cadenceMinutes.message}
                </p>
              )}
            </div>
            <fieldset className="grid gap-2">
              <Label className="flex items-center gap-1">
                <MonitorSmartphone className="size-4" />
                Audit Strategy
              </Label>
              <RadioGroup
                value={strategy}
                onValueChange={(value: "mobile" | "desktop") =>
                  setValue("strategy", value)
                }
                className="grid grid-cols-2 gap-3"
              >
                {strategies.map((option) => {
                  const labelId = `strategy-${option.value}-label`;
                  const descId = `strategy-${option.value}-desc`;
                  return (
                    <label
                      key={option.value}
                      className="relative flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-4 transition-colors has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 hover:bg-accent/50"
                    >
                      <RadioGroupItem
                        value={option.value}
                        aria-labelledby={labelId}
                        aria-describedby={descId}
                        className="sr-only"
                      />
                      <option.icon
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span
                        id={labelId}
                        className="text-sm font-medium leading-none tracking-tight"
                      >
                        {option.label}
                      </span>
                      <span
                        id={descId}
                        className="text-xs text-muted-foreground leading-none tracking-tight"
                      >
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
              {errors.strategy && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.strategy.message}
                </p>
              )}
            </fieldset>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setValue("isActive", checked)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/50 p-3">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-none tracking-tight text-muted-foreground">
                {isActive ? (
                  <>
                    First{" "}
                    <span className="font-medium text-foreground">
                      {strategy}
                    </span>{" "}
                    scan runs immediately after creation, then every{" "}
                    <span className="font-medium text-foreground">
                      {cadenceLabels[cadenceMinutes]}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Monitor is{" "}
                    <span className="font-medium text-foreground">paused</span>.
                    No scans will run until activated.
                  </>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="text"
              type="button"
              disabled={isLoading}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Monitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
