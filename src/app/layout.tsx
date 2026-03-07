import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://perflabs.dev"),
  title: {
    default: "PerfLabs – Web Performance Lab",
    template: "%s | PerfLabs",
  },
  description:
    "PerfLabs continuously monitors your Core Web Vitals, detects performance regressions, and explains exactly what changed before your users feel it.",
  keywords: [
    "Core Web Vitals monitoring",
    "performance regressions",
    "Lighthouse scores",
    "PageSpeed Insights",
    "web performance monitoring",
    "PerfLabs",
  ],
  openGraph: {
    type: "website",
    url: "/",
    title: "PerfLabs – Catch performance regressions before your users do",
    description:
      "Monitor Core Web Vitals across all your sites, detect regressions with rolling baselines, and get AI-powered explanations for every slowdown.",
    siteName: "PerfLabs",
  },
  twitter: {
    card: "summary_large_image",
    title: "PerfLabs – Web performance regression monitoring",
    description:
      "Detect Core Web Vitals regressions before your users feel them. Continuous audits, rolling baselines, and AI-powered summaries.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    // Set theme-color early so the browser bar matches on first paint
    requestAnimationFrame(function(){
      var bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      if (bg) {
        var m = document.querySelector('meta[name="theme-color"]');
        if (!m) { m = document.createElement('meta'); m.setAttribute('name','theme-color'); document.head.appendChild(m); }
        m.setAttribute('content', bg);
      }
    });
  } catch(e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SessionProvider session={session}>{children}</SessionProvider>
          <CookieConsent />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
