import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
// Derive assets host: us.i.posthog.com → us-assets.i.posthog.com
const posthogAssetsHost = posthogHost.replace(
  ".i.posthog.com",
  "-assets.i.posthog.com",
);

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' required for Next.js inline theme script + shadcn inline styles
  "script-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' required for Tailwind/shadcn CSS-in-JS patterns
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  // PostHog analytics (proxied through /ingest/ on same origin + direct fallback)
  // Sentry error reporting (tunneled through /monitoring + direct fallback)
  `connect-src 'self' ${posthogHost} ${posthogAssetsHost} https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Session Replay uses a Web Worker for off-thread compression
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // Proxy Sentry events through the Next.js server to bypass ad blockers
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,
});
