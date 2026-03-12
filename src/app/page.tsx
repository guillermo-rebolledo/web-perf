import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Clock, Flag, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
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
              <span className="p-2 rounded bg-primary/10">
                <Activity className="size-4 text-primary" />
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
                <Link href="/dashboard">Get started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="py-16 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent)_0%,transparent_100%)]">
        <section className="mx-auto max-w-4xl flex flex-col gap-4 py-16 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <div className="flex justify-center flex-col md:flex-row items-center gap-2">
            <span className="text-xs border border-emerald-500 rounded-full px-2 py-1 text-emerald-500 bg-emerald-500/10 font-semibold">
              <span
                className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0 mr-2 animate-pulse"
                aria-hidden="true"
              />
              Powered by Google PageSpeed Insights
            </span>
            <span className="text-xs border border-emerald-500 rounded-full px-2 py-1 text-emerald-500 bg-emerald-500/10 font-semibold">
              <span
                className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0 mr-2 animate-pulse"
                aria-hidden="true"
              />
              Now with AI-powered regression analysis
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-center tracking-tighter md:tracking-[-0.2rem]">
            Catch regressions before your users do.
          </h1>
          <p className="text-center text-muted-foreground text-sm md:text-lg leading-5">
            PerfLabs monitors your Core Web Vitals around the clock, catches
            regressions on every run, and surfaces what changed so you know
            where to look before your users feel it.
          </p>

          <div className="py-6 flex items-center justify-center">
            <Button asChild size="lg" className="w-auto shrink-0">
              <Link href="/dashboard">Start Monitoring Free</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-4xl flex flex-col gap-4 py-8 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <h2 className="text-5xl md:text-6xl font-extrabold text-center tracking-tighter md:tracking-[-0.2rem]">
            Continuous monitoring that works like your pipeline.
          </h2>
          <p className="text-center text-muted-foreground text-sm md:text-lg leading-5">
            Register a site. We handle the rest.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-500/20 w-fit rounded">
                  <Clock className="size-4 text-blue-500" />
                </span>
                <div className="font-bold text-base">Register your sites</div>
              </div>
              <div>
                Add any URL to PerfLabs. Run audits on a schedule, trigger them
                from the CLI, or fire one automatically on every deployment via
                a GitHub webhook.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/20 w-fit rounded">
                  <Clock className="size-4 text-emerald-500" />
                </span>
                <div className="font-bold text-base">
                  We run audits automatically
                </div>
              </div>
              <div>
                On schedule, we fetch{" "}
                <a
                  className="underline hover:text-primary focus:text-primary"
                  href="https://developers.google.com/speed/docs/insights/v5/about"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Google PageSpeed Insights
                </a>{" "}
                scores and capture every metric — LCP, CLS, TTFB, FID — across
                both mobile and desktop strategies.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/20 w-fit rounded">
                  <Flag className="size-4 text-amber-500" />
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
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-600/20 w-fit rounded">
                  <Sparkles className="size-4 text-purple-600" />
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

        <section className="mx-auto max-w-4xl flex flex-col gap-4 py-16 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <h2 className="text-5xl md:text-6xl font-extrabold text-center tracking-tighter md:tracking-[-0.2rem]">
            Built around regression detection, not just scores.
          </h2>
          <p className="text-center text-muted-foreground text-sm md:text-lg leading-5">
            Most performance tools give you a score. We tell you when it dropped
            and what caused it.
          </p>
          <p className="text-center text-muted-foreground text-sm md:text-lg leading-5">
            Our engine tracks a rolling median baseline for every metric across
            every monitor. Each audit gets compared to that baseline. When a
            metric degrades beyond your configured threshold, you get an alert —
            complete with a before/after diff across network timing, rendering,
            and main thread activity.
          </p>
        </section>

        <section className="mx-auto max-w-4xl py-8 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">Regression Detection</div>
              <div>
                Compare every audit to a rolling baseline. See exactly when your
                LCP went from &quot;Good&quot; to &quot;Needs Improvement&quot;
                — and which run triggered it.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">AI Run Summaries</div>
              <div>
                Get an explanation of what changed between runs — not just which
                metric dropped, but why it dropped and where to look first.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">Web Dashboard</div>
              <div>
                Track performance trends over time with timeline charts and
                side-by-side run comparisons. Monitor all your sites from one
                place.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">CLI Tool</div>
              <div>
                Run audits from your terminal. Scriptable, automatable, and
                CI-friendly. Trigger a run, assert a budget, or stream results
                directly into your build log.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">Mobile & Desktop</div>
              <div>
                Monitor both strategies independently. Mobile performance often
                tells a different story than desktop — and Google measures both.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
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
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">Slack Notifications</div>
              <div>
                Connect a Slack webhook once and every completed audit posts to
                your channel — performance score, all five Core Web Vitals, and
                any regressions flagged by severity. Green means clean. Red
                means act. No dashboard check required.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">Weekly Email Digest</div>
              <div>
                Every Monday, a performance summary lands in your inbox —
                Lighthouse scores, Core Web Vitals, week-over-week trends, and
                open alerts by severity for every site you monitor. Forward it
                to stakeholders, bring it to your retro, or just skip the
                dashboard entirely.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">
                Regression Pattern Analysis
              </div>
              <div>
                When the same metric keeps regressing, something structural is
                wrong. After three regressions in a 90-day window, the AI
                identifies the dominant root cause across all incidents, shows
                how often it recurs, and gives you one concrete fix — not a list
                of symptoms.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-2">
              <div className="font-bold text-base">First-Run Health Report</div>
              <div>
                The moment your monitor runs for the first time, the AI produces
                a full performance assessment — quick wins ranked by effort vs.
                impact, risk areas approaching critical thresholds, a
                recommended monitoring strategy, and a performance maturity
                score. Context from day one, before you have a baseline to
                compare against.
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl flex flex-col gap-4 py-8 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <h2 className="text-5xl md:text-6xl font-extrabold text-center tracking-tighter md:tracking-[-0.2rem]">
            A full picture, not just a score.
          </h2>
          <p className="text-center text-muted-foreground text-sm md:text-lg leading-5">
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

        <section className="mx-auto max-w-4xl flex flex-col gap-4 py-8 px-4 sm:px-8 lg:px-16 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <h2 className="text-5xl md:text-6xl font-extrabold text-center tracking-tighter md:tracking-[-0.2rem]">
            Set up monitoring in{" "}
            <span className="text-primary underline"> under 5 minutes</span>.
          </h2>
          <p className="text-center text-muted-foreground text-sm md:text-lg leading-5">
            Connect your first site, configure your monitors, and get your first
            regression alert — no credit card required.
          </p>

          <div className="py-6 flex flex-col md:flex-row items-center justify-center gap-3">
            <Button asChild className="w-auto shrink-0" size="lg">
              <Link href="/dashboard">Get Started</Link>
            </Button>
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
                <span className="p-2 rounded bg-primary/10">
                  <Activity className="size-4 text-primary" />
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
              PerfLabs {new Date().getFullYear()}
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
