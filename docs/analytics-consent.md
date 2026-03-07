# Analytics Consent

This document describes how user consent is managed for PostHog analytics.

---

## Legal basis

The privacy policy uses **consent** (GDPR Art. 6(1)(a)) as the legal basis for PostHog analytics. Consent must be freely given, specific, and informed — obtained via a cookie banner before any analytics data is captured. Continued use of the site does not constitute consent under GDPR.

---

## Architecture

### PostHog initialization (`src/instrumentation-client.ts`)

PostHog is initialized with `opt_out_capturing_by_default: true`. This means the SDK loads (so the `posthog` instance is available globally) but no events are captured until the user opts in.

Immediately after `posthog.init()`, the initialization code reads `localStorage` for a prior decision:

```ts
if (localStorage.getItem("perflabs-analytics-consent") === "granted") {
  posthog.opt_in_capturing();
}
```

This restores the opted-in state across page loads without re-showing the banner.

If `NEXT_PUBLIC_POSTHOG_KEY` is not set, PostHog is never initialized and the consent banner renders nothing.

### Consent storage

Consent decisions are stored in `localStorage` under the key `perflabs-analytics-consent`.

| Value | Meaning |
|-------|---------|
| `"granted"` | User accepted analytics |
| `"denied"` | User declined analytics |
| _(absent)_ | No decision made — banner is shown |

### Cookie consent banner (`src/components/cookie-consent.tsx`)

A `"use client"` component rendered in `src/app/layout.tsx` inside `<ThemeProvider>` after `{children}`.

**Mount behaviour:**
1. Read `localStorage.getItem("perflabs-analytics-consent")`.
2. If `"granted"` or `"denied"` — render nothing.
3. Otherwise — render the consent banner.

**Accept button:**
1. Write `"granted"` to localStorage.
2. Call `posthog.opt_in_capturing()`.
3. Hide the banner.

**Decline button:**
1. Write `"denied"` to localStorage.
2. Call `posthog.opt_out_capturing()` (no-op if PostHog was not initialized).
3. Hide the banner.

**SSR safety:** the component uses `useEffect` to read localStorage, avoiding hydration mismatch. The banner does not render on the server — it appears after the first client paint.

**Layout:** fixed to the bottom of the viewport. Does not block page interaction (not a modal).

**Motion:** the banner entry/exit animation must respect `prefers-reduced-motion` (use `@media (prefers-reduced-motion: reduce)` or the Tailwind `motion-reduce:` variant).

---

## Key files

| File | Role |
|------|------|
| `src/instrumentation-client.ts` | PostHog init with `opt_out_capturing_by_default: true` + localStorage restore |
| `src/components/cookie-consent.tsx` | Banner UI — Accept / Decline |
| `src/app/layout.tsx` | Renders `<CookieConsent />` after `{children}` |

---

## Changing the consent decision

Users can change their analytics preference at any time. The privacy policy directs them to email `privacy@updates.perflabs.dev`. A future improvement would be a settings toggle for analytics consent (similar to the weekly digest toggle) that calls `posthog.opt_in_capturing()` / `posthog.opt_out_capturing()` and updates localStorage.

---

## PostHog opt-in / opt-out API reference

```ts
posthog.opt_in_capturing()   // Start capturing — persists via PostHog's own cookie
posthog.opt_out_capturing()  // Stop capturing — sets opt-out cookie
posthog.has_opted_in_capturing()  // boolean
posthog.has_opted_out_capturing() // boolean
```

PostHog also sets its own persistence cookie (`ph_<key>_posthog`) when capturing is enabled. The privacy policy correctly discloses this under Section 5 (Analytics).
