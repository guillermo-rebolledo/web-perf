"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "perflabs-analytics-consent";

export function CookieConsent() {
  // Lazy initializer: returns false on the server (no window) so SSR output
  // matches. On the client, reads localStorage so returning visitors who
  // already responded never see the banner again.
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CONSENT_KEY) === null;
  });

  if (!visible) return null;

  function accept() {
    localStorage.setItem(CONSENT_KEY, "granted");
    posthog.opt_in_capturing();
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "denied");
    posthog.opt_out_capturing();
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur p-4 motion-reduce:transition-none">
      <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          We use analytics cookies to understand how you use PerfLabs.{" "}
          <a href="/legal/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
