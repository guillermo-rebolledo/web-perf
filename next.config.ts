import type { NextConfig } from "next";

const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
// Derive assets host: us.i.posthog.com → us-assets.i.posthog.com
const posthogAssetsHost = posthogHost.replace(
  ".i.posthog.com",
  "-assets.i.posthog.com"
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
  `connect-src 'self' ${posthogHost} ${posthogAssetsHost}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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

export default nextConfig;
