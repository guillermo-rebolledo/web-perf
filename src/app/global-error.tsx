"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="max-w-sm px-6 text-center">
          <p className="text-sm font-semibold text-secondary mb-2">Something went wrong</p>
          <h1 className="text-2xl font-bold mb-3">An unexpected error occurred</h1>
          <p className="text-muted-foreground mb-8">
            {error.digest
              ? `Error ID: ${error.digest}`
              : "Please try again or contact support if the issue persists."}
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
