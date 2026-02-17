import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarLayout } from "@/components/sidebar-layout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Web Performance Lab",
  description: "Monitor and analyze your website performance",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SessionProvider session={session}>
            {session ? (
              <SidebarProvider className="block">
                <AppSidebar />
                <SidebarLayout>{children}</SidebarLayout>
              </SidebarProvider>
            ) : (
              <main>{children}</main>
            )}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
