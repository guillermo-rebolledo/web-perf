"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { authorizeCliLogin } from "./actions";
import type { AuthorizeResult } from "./actions";

type ViewState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; email: string }
  | {
      phase: "error";
      reason: Extract<AuthorizeResult, { ok: false }>["reason"];
    };

interface Props {
  code: string;
  email: string;
}

export function CliAuthorizeForm({ code, email }: Props) {
  const [view, setView] = useState<ViewState>({ phase: "idle" });

  async function handleAuthorize() {
    setView({ phase: "loading" });
    const result = await authorizeCliLogin(code);
    if (result.ok) {
      setView({ phase: "success", email: result.email });
    } else {
      setView({ phase: "error", reason: result.reason });
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (view.phase === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">CLI authorized</h2>
          <p className="text-sm text-muted-foreground">
            Authenticated as{" "}
            <span className="font-medium text-foreground">{view.email}</span>
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          You can close this tab — your terminal is ready.
        </p>
        <a
          href="/settings"
          className="mt-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Manage API keys in Settings
        </a>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (view.phase === "error") {
    const messages: Record<
      typeof view.reason,
      { title: string; body: string }
    > = {
      expired: {
        title: "Code expired",
        body: "This authorization code has expired. Run side auth again to get a new one.",
      },
      already_used: {
        title: "Already authorized",
        body: "This code was already used. Your CLI should already be authenticated.",
      },
      unauthenticated: {
        title: "Session expired",
        body: "You were signed out. Refresh the page and sign in again.",
      },
      server_error: {
        title: "Something went wrong",
        body: "An unexpected error occurred on our end. Please try again.",
      },
    };

    const { title, body } = messages[view.reason];

    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        {view.reason === "server_error" && (
          <button
            onClick={() => setView({ phase: "idle" })}
            className="mt-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Try again
          </button>
        )}
        <a
          href="/dashboard"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Back to dashboard
        </a>
      </div>
    );
  }

  // ── Idle / Loading ─────────────────────────────────────────────────────────
  const isLoading = view.phase === "loading";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-tighter">
          Authorizing as
        </p>
        <p className="mt-0.5 font-medium tracking-tighter">{email}</p>
      </div>

      <p className="text-sm text-muted-foreground tracking-tighter">
        The CLI will receive an API key with a 90-day expiry. You can revoke it
        any time from{" "}
        <a
          href="/settings"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Settings → API Keys
        </a>
        .
      </p>

      <button
        onClick={() => void handleAuthorize()}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {isLoading ? "Authorizing…" : "Authorize CLI"}
      </button>

      <a
        href="/dashboard"
        className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel
      </a>
    </div>
  );
}
