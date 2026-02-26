import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RunErrorMessageProps {
  message: string;
  siteHref?: string;
}

/**
 * Displays a run's error message in an accessible, scannable callout.
 * Uses theme destructive colors and left-border accent for consistency with
 * other alert/error UI. role="alert" so assistive tech announces the error.
 */
export function RunErrorMessage({ message, siteHref }: RunErrorMessageProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex gap-3 rounded-lg border border-destructive/20 border-l-4 border-l-destructive/60 bg-destructive/5 px-4 py-3",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      )}
    >
      <span className="shrink-0 text-destructive" aria-hidden>
        <AlertCircle className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-destructive">
          Run failed
        </span>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap wrap-break-word">
          {message}
        </p>
        {siteHref ? (
          <Link
            href={siteHref}
            className="text-xs text-destructive/70 hover:text-destructive underline underline-offset-2 w-fit mt-1"
          >
            ← Back to site
          </Link>
        ) : null}
      </div>
    </div>
  );
}
