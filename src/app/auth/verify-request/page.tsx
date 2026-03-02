import { Mail } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07] bg-[radial-gradient(circle,var(--foreground)_1px,transparent_1px)] bg-size-[28px_28px]" />

      {/* Primary glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-3xl pointer-events-none bg-[radial-gradient(circle,color-mix(in_oklch,var(--primary)_18%,transparent)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-sm px-6">
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-px w-full bg-linear-to-r from-transparent via-primary/60 to-transparent" />

          <div className="p-8">
            {/* Icon */}
            <div className="mb-7 flex justify-center">
              <div className="relative">
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl shadow bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Heading & description */}
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Check your inbox
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A sign-in link is on its way to your email address. Click it to
                continue — no password needed.
              </p>
            </div>

            {/* Status chip */}
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-4 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">
                Link sent · expires in 24 hours
              </span>
            </div>

            {/* Footer link */}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Wrong email or need to try again?{" "}
              <a
                href="/auth/signin"
                className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                Go back
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
