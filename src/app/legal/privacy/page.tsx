import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "PerfLabs Privacy Policy — how we collect, use, and protect your data.",
};

const LAST_UPDATED = "March 1, 2026";
const CONTACT_EMAIL = "privacy@perflabs.app";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block"
        >
          ← Back to PerfLabs
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Who we are</h2>
            <p>
              PerfLabs (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
              is a web performance monitoring service. Our registered contact
              email is{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Data we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account data:</strong> email address, name, and OAuth
                provider ID when you sign in via Google or GitHub.
              </li>
              <li>
                <strong>Configuration data:</strong> the URLs and monitor
                settings you create.
              </li>
              <li>
                <strong>Performance data:</strong> Lighthouse scores and Core
                Web Vitals fetched from Google PageSpeed Insights for the sites
                you monitor.
              </li>
              <li>
                <strong>Usage data:</strong> page visits and feature
                interactions, collected via PostHog analytics (see Section 5).
              </li>
              <li>
                <strong>API keys:</strong> stored as SHA-256 hashes — we never
                store the raw key.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              3. How we use your data
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and operate the PerfLabs service.</li>
              <li>
                To send weekly performance digest emails (if you have enabled
                this).
              </li>
              <li>
                To detect performance regressions and send alert notifications.
              </li>
              <li>
                To improve the product through aggregated, anonymized usage
                analytics.
              </li>
            </ul>
            <p className="mt-3">We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              4. Legal basis for processing (GDPR)
            </h2>
            <p>
              For users in the European Economic Area, we process your data on
              the following legal bases:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Contract performance:</strong> processing necessary to
                provide the service you signed up for.
              </li>
              <li>
                <strong>Legitimate interests:</strong> improving product
                reliability and preventing fraud.
              </li>
              <li>
                <strong>Consent:</strong> for non-essential analytics cookies
                (PostHog), obtained via our cookie banner.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              5. Analytics (PostHog)
            </h2>
            <p>
              We use PostHog for product analytics. PostHog may set cookies to
              identify your browser session across visits. We proxy PostHog
              requests through our own domain ({"/ingest/..."}) to reduce
              latency and improve reliability. PostHog data is processed in the
              United States under Standard Contractual Clauses.
            </p>
            <p className="mt-2">
              You can opt out of analytics cookies at any time via the cookie
              consent banner or by emailing{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Data retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Performance run data is retained while your account is active.
              </li>
              <li>Screenshot data is automatically deleted after 30 days.</li>
              <li>
                On account deletion, all your data is permanently erased within
                30 days.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Your rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Access</strong> the data we hold about you (export
                available in Settings → Account).
              </li>
              <li>
                <strong>Delete</strong> your account and all associated data
                (Settings → Account → Delete account).
              </li>
              <li>
                <strong>Rectification</strong> — correct inaccurate data by
                contacting us.
              </li>
              <li>
                <strong>Portability</strong> — download your data in JSON format
                from Settings.
              </li>
              <li>
                <strong>Object</strong> to processing based on legitimate
                interests.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any right, email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline"
              >
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Data security</h2>
            <p>
              We use industry-standard security measures including TLS in
              transit, encrypted database connections, and hashed API key
              storage. Access to production systems is restricted to authorized
              personnel.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              9. Third-party services
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Google PageSpeed Insights:</strong> we send your
                monitored URLs to Google&apos;s API to retrieve performance
                data. Google&apos;s{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>{" "}
                applies.
              </li>
              <li>
                <strong>Resend:</strong> used to send transactional emails
                (digest, alerts). Your email address is shared only to deliver
                these messages.
              </li>
              <li>
                <strong>Vercel:</strong> our hosting provider. Infrastructure
                data (logs, IP addresses) is processed per Vercel&apos;s privacy
                policy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              10. Changes to this policy
            </h2>
            <p>
              We may update this policy to reflect changes in our practices or
              legal requirements. We will notify you by email for material
              changes. Continued use of PerfLabs after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Contact</h2>
            <p>
              For privacy questions or to exercise your rights, contact us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-sm text-muted-foreground flex gap-4">
          <Link href="/legal/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-foreground">
            Back to PerfLabs
          </Link>
        </div>
      </div>
    </div>
  );
}
