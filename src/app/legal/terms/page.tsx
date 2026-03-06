import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "PerfLabs Terms of Service — the rules for using our platform.",
};

const LAST_UPDATED = "March 1, 2026";
const CONTACT_EMAIL = "legal@perflabs.app";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block"
        >
          ← Back to PerfLabs
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of terms</h2>
            <p>
              By creating an account or using PerfLabs, you agree to these Terms of Service. If
              you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Description of service</h2>
            <p>
              PerfLabs is a web performance monitoring platform that periodically audits URLs you
              provide using Google PageSpeed Insights, stores the results, and notifies you of
              detected performance regressions. We offer this service subject to the terms below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Account registration</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>
                You must notify us immediately at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                if you suspect unauthorized access.
              </li>
              <li>One account per person. You may not share accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Monitor URLs you do not own or have explicit permission to audit (this may violate
                third-party terms or constitute unauthorized access).
              </li>
              <li>Use PerfLabs to scrape, aggregate, or resell data without our consent.</li>
              <li>
                Attempt to reverse-engineer, disrupt, or overload the platform or its
                infrastructure.
              </li>
              <li>Use automated scripts to create excessive API requests beyond normal usage.</li>
              <li>Use the service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. API usage</h2>
            <p>
              API access is subject to rate limits documented in the platform. Excessive usage that
              degrades service for other users may result in temporary or permanent account
              suspension.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Third-party services</h2>
            <p>
              PerfLabs uses Google PageSpeed Insights to perform audits. We are not responsible for
              the accuracy, availability, or changes to Google&apos;s API. Audit results depend on
              Google&apos;s service and may vary.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Data and intellectual property</h2>
            <p>
              You retain ownership of your data (URLs, monitor configurations, and audit results).
              You grant PerfLabs a limited license to process and store this data solely to provide
              the service. We do not claim ownership of your data.
            </p>
            <p className="mt-2">
              PerfLabs retains all rights to the platform, software, design, and documentation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Availability and SLA</h2>
            <p>
              We strive for high availability but do not guarantee uninterrupted service. PerfLabs
              is provided &ldquo;as is&rdquo; without warranty of uptime. Scheduled maintenance
              will be announced in advance where possible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Disclaimer of warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES
              OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Limitation of liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PERFLABS SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
              PROFITS OR REVENUES, ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Account termination</h2>
            <p>
              You may delete your account at any time from Settings. We may suspend or terminate
              accounts that violate these Terms, with or without notice, depending on the severity
              of the violation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Changes to terms</h2>
            <p>
              We may update these Terms. We will notify you by email for material changes. Continued
              use after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Governing law</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which PerfLabs operates,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">14. Contact</h2>
            <p>
              For legal inquiries, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-sm text-muted-foreground flex gap-4">
          <Link href="/legal/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/" className="hover:text-foreground">
            Back to PerfLabs
          </Link>
        </div>
      </div>
    </div>
  );
}
