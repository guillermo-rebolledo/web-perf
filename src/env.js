import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not have to set NEXTAUTH_URL
      // since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string().min(1) : z.string().url(),
    ),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    EMAIL_SERVER_USER: z.string().min(1).optional(),
    EMAIL_SERVER_PASSWORD: z.string().min(1).optional(),
    EMAIL_SERVER_HOST: z.string().min(1).optional(),
    EMAIL_SERVER_PORT: z.coerce.number().optional(),
    EMAIL_FROM: z.string().email().optional(),
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().optional(),
    PAGESPEED_API_KEY: z.string().min(1),
    SCHEDULER_SECRET: z.string().min(32),
    HEALTH_SECRET: z.string().min(16).optional(),
    RATE_LIMIT_RUNS_PER_DAY: z.coerce.number().default(100),
    RATE_LIMIT_SCHEDULED_RUNS_PER_DAY: z.coerce.number().default(500),
    SCREENSHOT_TTL_DAYS: z.coerce.number().default(30),
    OPENAI_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z
      .string()
      .email()
      .default("digest@updates.perflabs.dev"),
    SENTRY_DSN: z.string().url().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_FROM: process.env.EMAIL_FROM,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    PAGESPEED_API_KEY: process.env.PAGESPEED_API_KEY,
    SCHEDULER_SECRET: process.env.SCHEDULER_SECRET,
    HEALTH_SECRET: process.env.HEALTH_SECRET,
    RATE_LIMIT_RUNS_PER_DAY: process.env.RATE_LIMIT_RUNS_PER_DAY,
    RATE_LIMIT_SCHEDULED_RUNS_PER_DAY: process.env.RATE_LIMIT_SCHEDULED_RUNS_PER_DAY,
    SCREENSHOT_TTL_DAYS: process.env.SCREENSHOT_TTL_DAYS,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   * This is especially useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

// Cross-field validation: all EMAIL_SERVER_* vars must be set together or not at all.
if (!process.env.SKIP_ENV_VALIDATION) {
  const emailVars = {
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };
  const set = Object.values(emailVars).filter(Boolean);
  if (set.length > 0 && set.length !== Object.keys(emailVars).length) {
    const missing = Object.entries(emailVars)
      .filter(([, v]) => !v)
      .map(([k]) => k)
      .join(", ");
    throw new Error(
      `Partial email configuration detected. Set all EMAIL_SERVER_* and EMAIL_FROM vars or none of them. Missing: ${missing}`,
    );
  }
}
