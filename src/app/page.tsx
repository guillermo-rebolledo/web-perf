import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Globe, Clock, Flag, Sparkles, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppPreviewCarousel } from "@/components/app-preview-carousel";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Catch Web Vitals regressions before your users do",
  description:
    "PerfLabs monitors your Core Web Vitals around the clock, flags regressions on every run, and surfaces what changed so you can fix issues before users feel them.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PerfLabs – Catch Web Vitals regressions before your users do",
    description:
      "Continuous Core Web Vitals monitoring, regression detection with rolling baselines, and AI explanations for every slowdown.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "PerfLabs – Catch Web Vitals regressions before your users do",
    description:
      "Monitor Core Web Vitals, detect performance regressions, and get AI-powered explanations before users feel the slowdown.",
  },
};

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8 lg:px-16">
          <div className="flex h-16 items-center justify-between">
            <div className="flex gap-2 items-center">
              <span className="size-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                <Activity className="size-4" />
              </span>
              <span className="font-semibold font-geist-mono tracking-tighter">
                perflabs
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button asChild size="sm" variant="secondary">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/dashboard">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="py-16 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent)_0%,transparent_100%)]">
        <section className="mx-auto max-w-4xl flex flex-col gap-4 py-16 px-4 sm:px-8 lg:px-16">
          <div className="flex justify-center animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
            <Badge>Powered by Google PageSpeed Insights</Badge>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-center tracking-tight md:tracking-[-0.04em] animate-in fade-in-0 slide-in-from-bottom-8 duration-700 [animation-delay:120ms] [animation-fill-mode:both]">
            Catch regressions before your users do.
          </h1>
          <p className="text-center text-muted-foreground text-sm md:text-lg leading-6 md:leading-7 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:240ms] [animation-fill-mode:both]">
            PerfLabs monitors your Core Web Vitals around the clock, catches
            regressions on every run, and surfaces what changed so you know
            where to look before your users feel it.
          </p>

          <div className="py-6 flex items-center justify-center animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:360ms] [animation-fill-mode:both]">
            <Button
              asChild
              size="lg"
              className="w-auto shrink-0 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Link href="/dashboard">Start Monitoring Free</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-4xl flex flex-col gap-6 py-12 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter md:tracking-[-0.15rem]">
              Continuous monitoring that works like your pipeline.
            </h2>
            <p className="text-muted-foreground text-sm md:text-base leading-6 mt-2 max-w-lg">
              Register a site. We handle the rest.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="border border-border rounded-xl bg-card p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <span
                className="absolute top-1 right-3 text-8xl font-black leading-none text-primary/[0.06] pointer-events-none select-none font-geist-mono"
                aria-hidden="true"
              >
                01
              </span>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-primary/15 w-fit rounded-md">
                  <Globe className="size-4 text-primary" />
                </span>
                <div className="font-bold text-base">Register your sites</div>
              </div>
              <div>
                Add any URL to PerfLabs. Run audits on a schedule, trigger them
                from the CLI, or fire one automatically on every deployment via
                a GitHub webhook.
              </div>
            </div>
            <div className="border border-border rounded-xl bg-card p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <span
                className="absolute top-1 right-3 text-8xl font-black leading-none text-primary/[0.06] pointer-events-none select-none font-geist-mono"
                aria-hidden="true"
              >
                02
              </span>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-primary/15 w-fit rounded-md">
                  <Clock className="size-4 text-primary" />
                </span>
                <div className="font-bold text-base">
                  We run audits automatically
                </div>
              </div>
              <div>
                On schedule, we fetch{" "}
                <a
                  className="underline transition-colors hover:text-primary focus:text-primary"
                  href="https://developers.google.com/speed/docs/insights/v5/about"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Google PageSpeed Insights
                </a>{" "}
                scores and capture every metric — LCP, CLS, TTFB, INP — across
                both mobile and desktop strategies.
              </div>
            </div>
            <div className="border border-border rounded-xl bg-card p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden h-fit transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <span
                className="absolute top-1 right-3 text-8xl font-black leading-none text-[var(--score-warning)]/[0.08] pointer-events-none select-none font-geist-mono"
                aria-hidden="true"
              >
                03
              </span>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[var(--score-warning)]/15 w-fit rounded-md">
                  <Flag className="size-4 text-[var(--score-warning)]" />
                </span>
                <div className="font-bold text-base">
                  Regressions get flagged immediately
                </div>
              </div>
              <div>
                Our regression engine compares each run against a rolling
                baseline. When a metric degrades past your threshold, you get an
                alert with a structured diff: what changed, by how much, and
                when.
              </div>
            </div>
            <div className="border border-border rounded-xl bg-card p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <span
                className="absolute top-1 right-3 text-8xl font-black leading-none text-primary/[0.06] pointer-events-none select-none font-geist-mono"
                aria-hidden="true"
              >
                04
              </span>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-primary/15 w-fit rounded-md">
                  <Sparkles className="size-4 text-primary" />
                </span>
                <div className="font-bold text-base">
                  AI works at every layer
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="font-semibold">On every run —</span> a
                  narrative summary explains whether the regression came from a
                  new render-blocking script, a layout shift, a third-party
                  slowdown, or something else entirely.
                </div>
                <div>
                  <span className="font-semibold">On your first run —</span> a
                  full health report assesses your site&apos;s performance
                  posture: quick wins, risk areas, and a maturity score. Context
                  before you have a baseline.
                </div>
                <div>
                  <span className="font-semibold">Across runs —</span> when the
                  same metric keeps regressing, pattern analysis identifies the
                  dominant root cause and gives you one concrete fix.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl flex flex-col gap-6 py-12 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter md:tracking-[-0.15rem]">
              Built around regression detection, not just scores.
            </h2>
            <p className="text-muted-foreground text-sm md:text-base leading-6 mt-2 max-w-lg">
              Most performance tools give you a score. We tell you when it
              dropped and what caused it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="border border-border rounded-xl bg-card p-4 flex flex-col gap-2 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="font-bold text-base">Regression Detection</div>
              <div>
                Compare every audit to a rolling baseline. See exactly when your
                LCP went from &quot;Good&quot; to &quot;Needs Improvement&quot;
                — and which run triggered it — with a before/after diff across
                network timing, rendering, and main thread activity.
              </div>
            </div>
            <div className="border border-border rounded-xl bg-card p-4 flex flex-col gap-2 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="font-bold text-base">Deploy-triggered Audits</div>
              <div>
                Connect a GitHub webhook and every successful deployment
                triggers an audit automatically. Works with Vercel, Railway,
                Netlify, and any CI that emits{" "}
                <code className="font-geist-mono text-xs">
                  deployment_status
                </code>{" "}
                events — no polling, no cron lag, no manual runs.
              </div>
            </div>
            <div className="border border-border rounded-xl bg-card p-4 flex flex-col gap-2 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="font-bold text-base">CLI Tool</div>
              <div>
                Run audits from your terminal. Scriptable, automatable, and
                CI-friendly. Trigger a run, assert a budget, or stream results
                directly into your build log.
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Also includes
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>AI run summaries</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>First-run health report</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Pattern analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Web dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Mobile &amp; desktop</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Slack notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Weekly email digest</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl flex flex-col gap-4 py-12 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <h2 className="text-4xl md:text-5xl font-extrabold text-center tracking-tighter md:tracking-[-0.15rem]">
            A full picture, not just a score.
          </h2>
          <p className="text-center text-muted-foreground text-sm md:text-base leading-6 max-w-xl mx-auto">
            Every run lands in your dashboard, your alert feed, and your history
            log — so you always know what changed, when it changed, and which
            site needs attention first.
          </p>

          {/* Extra top padding absorbs the upward stack overflow of back cards */}
          <div className="w-full flex justify-center pt-[160px] pb-8">
            <AppPreviewCarousel />
          </div>
        </section>

        {/* CLI section — temporarily commented out
        <section className="mx-auto max-w-4xl flex flex-col gap-4 py-8 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <h2 className="text-5xl md:text-6xl font-extrabold text-center tracking-tighter md:tracking-[-0.2rem]">
            Run an audit
          </h2>
          <p className="text-center text-muted-foreground text-sm md:text-lg leading-5">
            Once your sites and monitors are set up, running an audit is one
            command. Pass a monitor ID directly — or just point it at a URL and
            <span className="font-semibold">perflabs</span> resolves the right
            monitor for you. Results stream back to your terminal in real time:
            Core Web Vitals scores, detected regressions, and a direct link to
            the full report in your dashboard.
          </p>

          <div className="w-full flex justify-center py-8">
            <div className="w-full max-w-xl">
              <TerminalWindow
                title="zsh — perflabs"
                className="relative w-full"
              >
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6ee7b7]">$</span>
                    <code className="whitespace-pre-wrap break-all">
                      perflabs run --url https://yoursite.com/
                    </code>
                  </div>

                  <pre className="whitespace-pre text-[12px] leading-relaxed text-[#e5e5e7] overflow-x-auto">
                    {`✓ Run queued (ID: cm9xyz456)
✓ Run completed

╭──────────────────────────────╮
│ Lighthouse Scores            │
│ ──────────────────────────── │
│ Performance        47        │
│ Accessibility      98        │
│ Best Practices     91        │
│ SEO               100        │
╰──────────────────────────────╯

╭───────────────────────────╮
│ Core Web Vitals           │
│ ───────────────────────── │
│ LCP    4,312 ms           │
│ INP       85 ms           │
│ CLS        0.042          │
│ FCP    2,104 ms           │
│ TTFB     412 ms           │
╰───────────────────────────╯

2 regression(s) detected (1 critical, 1 moderate)
  • LCP    +38.2% critical
  • FCP    +22.4% moderate

Full results: https://perflabs.dev/runs/cm9xyz456`}
                  </pre>
                </div>
              </TerminalWindow>
            </div>
          </div>
        </section>
        */}

        <section className="w-full border-t border-primary/20 bg-primary animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <div className="mx-auto max-w-4xl px-4 sm:px-8 lg:px-16 py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-primary-foreground">
                Set up monitoring in{" "}
                <span className="text-[var(--score-warning)] underline underline-offset-4 decoration-[var(--score-warning)]/60 decoration-2">
                  under 5 minutes
                </span>
                .
              </h2>
              <p className="text-primary-foreground/70 text-sm md:text-base leading-6 max-w-md">
                Connect your first site, configure your monitors, and get your
                first regression alert — no credit card required.
              </p>
            </div>
            <div className="shrink-0">
              <Button
                asChild
                size="lg"
                className="bg-background text-primary hover:bg-background/90 shadow transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Link href="/dashboard">Start Monitoring Free</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8 lg:px-16">
          {/* Main footer content */}
          <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 md:grid-cols-5">
            {/* Brand column */}
            <div className="flex flex-col gap-4 md:col-span-2">
              <div className="flex gap-2 items-center">
                <span className="size-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                  <Activity className="size-4" />
                </span>
                <span className="font-semibold font-geist-mono tracking-tighter">
                  perflabs
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Continuous Core Web Vitals monitoring with regression detection
                and root cause analysis — built for engineering teams who care
                about performance.
              </p>
            </div>

            {/* Product links */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Product
              </p>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li>
                  <Link
                    href="/dashboard"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources links */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Resources
              </p>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li>
                  <a
                    href="https://developers.google.com/speed/docs/insights/v5/about"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    PageSpeed Insights
                  </a>
                </li>
                <li>
                  <a
                    href="https://web.dev/articles/vitals"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Core Web Vitals
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact links */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Contact
              </p>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li>
                  <a
                    href="mailto:gortiz.dev@gmail.com"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Get in touch
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/gortizdev/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Let&apos;s work together!
                  </a>
                </li>
                <li>
                  <a
                    href="https://memorebo.dev"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    memorebo.dev
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:gortiz.dev@gmail.com?subject=PerfLabs%20-%20Issue%20Report"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Report an issue
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col gap-3 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} PerfLabs
            </p>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <Link
                href="/legal/privacy"
                className="transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                href="/legal/terms"
                className="transition-colors hover:text-foreground"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
