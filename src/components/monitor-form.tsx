"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Check,
  Clock,
  Copy,
  GitBranch,
  Info,
  Monitor,
  MonitorSmartphone,
  Rocket,
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

const scheduleSchema = z.object({
  siteId: z.string(),
  triggerType: z.literal("schedule"),
  cadenceMinutes: z.number().int().min(30).max(43200),
  strategy: z.enum(["mobile", "desktop"]),
  isActive: z.boolean(),
});

const deploymentSchema = z.object({
  siteId: z.string(),
  triggerType: z.literal("deployment"),
  strategy: z.enum(["mobile", "desktop"]),
  isActive: z.boolean(),
  githubBranch: z.string().min(1),
  githubRepo: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;
type DeploymentFormData = z.infer<typeof deploymentSchema>;
type TriggerType = "schedule" | "deployment";

interface MonitorFormProps {
  siteId: string;
  baseUrl?: string;
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

function StrategyRadio({
  value,
  onChange,
}: {
  value: "mobile" | "desktop";
  onChange: (v: "mobile" | "desktop") => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v: "mobile" | "desktop") => onChange(v)}
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
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0"
      onClick={handleCopy}
      title="Copy"
    >
      {copied ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  );
}

interface SetupViewProps {
  monitorId: string;
  webhookSecret: string;
  baseUrl: string;
  onDone: () => void;
}

function SetupView({ monitorId, webhookSecret, baseUrl, onDone }: SetupViewProps) {
  const webhookUrl = `${baseUrl}/api/webhooks/github/${monitorId}`;

  return (
    <div className="grid gap-5">
      {/* Compatibility callout */}
      <div className="flex items-start gap-3 rounded-lg border border-border/60 border-l-4 border-l-secondary bg-muted/50 p-3">
        <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Works automatically with{" "}
          <span className="font-medium text-foreground">Vercel</span>,{" "}
          <span className="font-medium text-foreground">Netlify</span>,{" "}
          <span className="font-medium text-foreground">Render</span>, and{" "}
          <span className="font-medium text-foreground">GitHub Actions</span>{" "}
          that emit <code className="font-mono text-xs">deployment_status</code> events.
        </p>
      </div>

      {/* Webhook URL */}
      <div className="grid gap-2">
        <Label className="text-sm font-medium">Webhook URL</Label>
        <div className="flex gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-xs" />
          <CopyButton text={webhookUrl} />
        </div>
      </div>

      {/* Secret — shown once */}
      <div className="grid gap-2">
        <Label className="text-sm font-medium">
          Webhook Secret{" "}
          <span className="text-destructive font-normal text-xs">— not shown again</span>
        </Label>
        <div className="flex gap-2">
          <Input value={webhookSecret} readOnly className="font-mono text-xs" />
          <CopyButton text={webhookSecret} />
        </div>
        <p className="text-xs text-muted-foreground">
          Copy this now and paste it into GitHub Webhooks → Secret. It will not be
          retrievable after you close this dialog.
        </p>
      </div>

      {/* Setup instructions */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold text-foreground mb-2 tracking-tight uppercase">
          Setup Instructions
        </p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground leading-relaxed">
          <li>Go to your GitHub repo → Settings → Webhooks → Add webhook</li>
          <li>Paste the Webhook URL above into the Payload URL field</li>
          <li>Set Content type to <code className="font-mono">application/json</code></li>
          <li>Paste the secret into the Secret field</li>
          <li>
            Under &ldquo;Which events?&rdquo;, select{" "}
            <em>Let me select individual events</em> and check{" "}
            <strong>Deployment statuses</strong>
          </li>
          <li>Save and verify the green checkmark appears</li>
        </ol>
      </div>

      <DialogFooter>
        <Button onClick={onDone} className="w-full">
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}

export function MonitorForm({
  siteId,
  baseUrl = "",
  onSuccess,
  triggerButton,
}: MonitorFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggerType, setTriggerType] = useState<TriggerType>("schedule");
  // After successful deployment creation, show setup view
  const [setupState, setSetupState] = useState<{
    monitorId: string;
    webhookSecret: string;
  } | null>(null);

  const router = useRouter();

  const scheduleForm = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      siteId,
      triggerType: "schedule",
      cadenceMinutes: 1440,
      strategy: "mobile",
      isActive: true,
    },
  });

  const deploymentForm = useForm<DeploymentFormData>({
    resolver: zodResolver(deploymentSchema),
    defaultValues: {
      siteId,
      triggerType: "deployment",
      strategy: "mobile",
      isActive: true,
      githubBranch: "main",
      githubRepo: "",
    },
  });

  const cadenceMinutes = scheduleForm.watch("cadenceMinutes");
  const scheduleStrategy = scheduleForm.watch("strategy");
  const isActive = scheduleForm.watch("isActive");
  const deploymentStrategy = deploymentForm.watch("strategy");

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      // Reset on close
      scheduleForm.reset();
      deploymentForm.reset();
      setTriggerType("schedule");
      setSetupState(null);
      setError(null);
    }
  }

  const onScheduleSubmit = async (data: ScheduleFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create monitor");
      }
      posthog.capture(AnalyticsEvent.monitor_add, {
        monitor_site: siteId,
        monitor_trigger: "schedule",
        monitor_cadence: data.cadenceMinutes,
        monitor_strategy: data.strategy,
      });
      scheduleForm.reset();
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const onDeploymentSubmit = async (data: DeploymentFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        ...data,
        githubRepo: data.githubRepo || null,
        githubBranch: data.githubBranch || "main",
      };
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create monitor");
      }
      const result = await response.json();
      posthog.capture(AnalyticsEvent.monitor_add, {
        monitor_site: siteId,
        monitor_trigger: "deployment",
        monitor_strategy: data.strategy,
      });
      setSetupState({ monitorId: result.id, webhookSecret: result.webhookSecret });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  function handleDone() {
    setOpen(false);
    onSuccess?.();
    router.refresh();
  }

  const triggerCards = [
    {
      value: "schedule" as const,
      icon: Clock,
      label: "On a Schedule",
      description: "Runs every N hours or days automatically",
    },
    {
      value: "deployment" as const,
      icon: Rocket,
      label: "On Deployment",
      description: "Fires on every successful deploy",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton || <Button>Create Monitor</Button>}
      </DialogTrigger>
      <DialogContent>
        {setupState ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="size-5 text-secondary" />
                Deployment Monitor Created
              </DialogTitle>
              <DialogDescription>
                Add this webhook to your GitHub repo to trigger audits on every
                successful deployment.
              </DialogDescription>
            </DialogHeader>
            <SetupView
              monitorId={setupState.monitorId}
              webhookSecret={setupState.webhookSecret}
              baseUrl={baseUrl}
              onDone={handleDone}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MonitorSmartphone className="size-5 text-secondary" />
                Configure Audit Monitor
              </DialogTitle>
              <DialogDescription>
                Set up automated performance tracking for Core Web Vitals and
                PageSpeed Insights to catch regressions before they hit production.
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Trigger type selector */}
            <fieldset className="grid gap-2">
              <Label className="text-sm font-medium">Trigger Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {triggerCards.map((card) => (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => setTriggerType(card.value)}
                    className={`flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 ${
                      triggerType === card.value
                        ? "border-secondary bg-secondary/5"
                        : "border-border"
                    }`}
                  >
                    <card.icon
                      className={`size-5 ${triggerType === card.value ? "text-secondary" : "text-muted-foreground"}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium leading-none tracking-tight">
                      {card.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-none tracking-tight">
                      {card.description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Step 2a: Schedule path */}
            {triggerType === "schedule" && (
              <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)}>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1">
                      <Calendar className="size-4" /> Scan Frequency
                    </Label>
                    <Select
                      value={cadenceMinutes.toString()}
                      onValueChange={(value) =>
                        scheduleForm.setValue("cadenceMinutes", parseInt(value, 10))
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
                    {scheduleForm.formState.errors.cadenceMinutes && (
                      <p className="text-sm text-destructive">
                        {scheduleForm.formState.errors.cadenceMinutes.message}
                      </p>
                    )}
                  </div>
                  <fieldset className="grid gap-2">
                    <Label className="flex items-center gap-1">
                      <MonitorSmartphone className="size-4" />
                      Audit Strategy
                    </Label>
                    <StrategyRadio
                      value={scheduleStrategy}
                      onChange={(v) => scheduleForm.setValue("strategy", v)}
                    />
                  </fieldset>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="isActive" className="text-sm font-medium">
                        Active
                      </Label>
                      <p className="text-xs text-muted-foreground leading-none tracking-tight">
                        Scans run on schedule when enabled
                      </p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={(checked) =>
                        scheduleForm.setValue("isActive", checked)
                      }
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 border-l-4 border-l-secondary bg-muted/50 p-3">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-none tracking-tight text-muted-foreground">
                      {isActive ? (
                        <>
                          First{" "}
                          <span className="font-medium text-foreground">
                            {scheduleStrategy}
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
            )}

            {/* Step 2b: Deployment path */}
            {triggerType === "deployment" && (
              <form onSubmit={deploymentForm.handleSubmit(onDeploymentSubmit)}>
                <div className="grid gap-4 py-2">
                  <fieldset className="grid gap-2">
                    <Label className="flex items-center gap-1">
                      <MonitorSmartphone className="size-4" />
                      Audit Strategy
                    </Label>
                    <StrategyRadio
                      value={deploymentStrategy}
                      onChange={(v) => deploymentForm.setValue("strategy", v)}
                    />
                  </fieldset>
                  <div className="grid gap-2">
                    <Label htmlFor="githubBranch" className="text-sm font-medium">
                      Branch
                    </Label>
                    <Input
                      id="githubBranch"
                      {...deploymentForm.register("githubBranch")}
                      placeholder="main"
                      className="font-mono text-xs"
                    />
                    {deploymentForm.formState.errors.githubBranch && (
                      <p className="text-sm text-destructive">
                        {deploymentForm.formState.errors.githubBranch.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="githubRepo" className="text-sm font-medium">
                      Repository{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="githubRepo"
                      {...deploymentForm.register("githubRepo")}
                      placeholder="owner/repo"
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      For display only — not used in webhook matching.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-border/60 border-l-4 border-l-secondary bg-muted/50 p-3">
                    <Rocket className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      A webhook URL and secret will be generated after creation.
                      Add them to your GitHub repo to trigger audits automatically
                      on every successful deployment.
                    </p>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
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
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
