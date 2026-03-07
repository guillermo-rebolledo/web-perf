import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { env } from "@/env.js";

// --- Sentry (error monitoring, tracing, session replay) ---

if (env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,

    sendDefaultPii: true,

    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [Sentry.replayIntegration()],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// --- PostHog (product analytics) ---

const isPostHogEnabled =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true";

if (isPostHogEnabled && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30",
    opt_out_capturing_by_default: true,
  });
  // Restore prior consent decision immediately after init
  if (
    typeof localStorage !== "undefined" &&
    localStorage.getItem("perflabs-analytics-consent") === "granted"
  ) {
    posthog.opt_in_capturing();
  }
}
