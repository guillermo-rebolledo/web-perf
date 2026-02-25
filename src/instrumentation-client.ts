import posthog from "posthog-js";
import { env } from "@/env.js";

const isEnabled =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true";

if (isEnabled && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30",
  });
}
