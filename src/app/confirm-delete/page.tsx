"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ConfirmDeletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 rounded-lg bg-card p-8 shadow text-center">
          <h1 className="text-xl font-semibold text-destructive">Invalid link</h1>
          <p className="text-muted-foreground text-sm">
            This deletion link is missing a token. Request a new one from your account settings.
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 rounded-lg bg-card p-8 shadow text-center">
          <h1 className="text-xl font-semibold">Account deleted</h1>
          <p className="text-muted-foreground text-sm">
            Your account and all associated data have been permanently deleted.
          </p>
        </div>
      </div>
    );
  }

  async function handleConfirm() {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/user/confirm-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setStatus("success");
        // Clear the session cookie by redirecting to sign-in after a moment
        setTimeout(() => router.push("/auth/signin"), 2000);
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-card p-8 shadow">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold">Confirm account deletion</h1>
          <p className="text-muted-foreground text-sm">
            This will permanently delete your account and all associated data —
            sites, monitors, runs, and alerts. This action cannot be undone.
          </p>
        </div>

        {status === "error" && errorMessage && (
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive text-center">
            {errorMessage}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Deleting…" : "Yes, permanently delete my account"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/settings")}
            disabled={status === "loading"}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
