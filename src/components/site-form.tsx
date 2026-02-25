"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { canonicalizeUrl } from "@/lib/url-utils";
import { CirclePlus, FolderPen, Lightbulb, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import { AnalyticsEvent } from "@/lib/analytics-events";

const siteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  url: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (val) => {
        try {
          const hostname = new URL(val).hostname;
          return hostname.includes(".");
        } catch {
          return false;
        }
      },
      { message: "URL must have a valid domain (e.g. example.com)" },
    ),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface SiteFormProps {
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export function SiteForm({ onSuccess, triggerButton }: SiteFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isSubmitted },
    reset,
    setValue,
    watch,
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: SiteFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create site");
      }
      posthog.capture(AnalyticsEvent.site_add, { site_name: data.name, site_url: data.url });
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

  const handleUrlBlur = () => {
    const url = watch("url");
    if (url) {
      try {
        const canonical = canonicalizeUrl(url);
        setValue("url", canonical);
      } catch {
        // Invalid URL, let validation handle it
      }
    }
  };

  function handleCancel() {
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button>
            <CirclePlus />
            Create Site
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Monitor New Site</DialogTitle>
          <DialogDescription>
            Add a website to track its performance over time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                <FolderPen className="" />
                Site Name
              </Label>
              <Input
                id="name"
                placeholder="My Awesome Site"
                className={cn(
                  (touchedFields.name || isSubmitted) &&
                    errors.name &&
                    "border-destructive focus-visible:ring-destructive",
                )}
                {...register("name")}
              />
              {(touchedFields.name || isSubmitted) && errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url" className="flex items-center gap-1">
                <Link className="size-4" />
                Website URL
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.example.com"
                className={cn(
                  (touchedFields.url || isSubmitted) &&
                    errors.url &&
                    "border-destructive focus-visible:ring-destructive",
                )}
                {...register("url")}
                onBlur={handleUrlBlur}
              />
              {(touchedFields.url || isSubmitted) && errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="bg-amber-100 p-2 rounded flex items-start gap-2">
              <Lightbulb className="size-8 text-amber-800" />
              <div className="flex flex-col">
                <p className="text-sm font-semibold tracking-tighter text-amber-800">
                  Tip
                </p>
                <p className="text-xs tracking-tighter text-amber-800">
                  Use the final destination URL of your page. Redirects can skew
                  performance metrics and slow down scans.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="text"
              type="button"
              disabled={isLoading}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
