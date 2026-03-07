# Production Blockers — Implementation Plan

Three blocking items must be resolved before opening PerfLabs to real users. Each is documented in its own reference file below.

| # | Item | Doc |
|---|------|-----|
| P0-1 | Account management UI (delete + export) | [account-management.md](./account-management.md) |
| P0-2 | Cookie consent banner (PostHog gating) | [analytics-consent.md](./analytics-consent.md) |
| P0-3 | Per-user resource limits | [resource-limits.md](./resource-limits.md) |

---

## P0-1 — Account Management UI

**Problem.** `DELETE /api/user` and `GET /api/user/export` are fully implemented. The privacy policy and ToS both promise these features exist in "Settings → Account". The settings page has no such section. Users cannot exercise their GDPR Art. 17 (erasure) or Art. 20 (portability) rights from the UI.

**What to build.**

1. **`src/components/account-section.tsx`** — a new `"use client"` component with two actions:
   - **Export data**: a button that calls `GET /api/user/export` and saves the response as a JSON file download using a temporary `<a>` with `download` attribute. No modal needed.
   - **Delete account**: a button that opens a shadcn `AlertDialog` to confirm. On confirm, calls `DELETE /api/user`. If Resend is configured the API returns 202 — show a toast "Check your email to confirm deletion." If Resend is not configured it returns 204 — sign the user out and redirect to `/`.

2. **`src/app/(app)/settings/page.tsx`** — add an "Account" `<section>` at the bottom of the page (below Notifications), rendering `<AccountSection />`. No server-side data is needed for this component.

**Files changed.**

| File | Action |
|------|--------|
| `src/components/account-section.tsx` | Create |
| `src/app/(app)/settings/page.tsx` | Edit — add Account section |
| `docs/account-management.md` | Create (feature reference) |

**Edge cases.**
- If `DELETE /api/user` returns 204 (no email flow), call `signOut({ callbackUrl: "/" })` from next-auth/react.
- The export endpoint streams a JSON attachment — use `res.blob()` + `URL.createObjectURL()` to trigger the browser download without a page navigation.
- The delete dialog must use a destructive variant button to make the weight of the action clear.

---

## P0-2 — Cookie Consent Banner

**Problem.** PostHog is initialized unconditionally in `src/instrumentation-client.ts` when `NEXT_PUBLIC_POSTHOG_KEY` is set. The privacy policy lists "consent" as the legal basis for PostHog and references a cookie banner — but no banner exists. EU users are tracked without consent.

**What to build.**

1. **Restructure PostHog init in `src/instrumentation-client.ts`**: add `opt_out_capturing_by_default: true` to the `posthog.init()` call, then immediately check `localStorage` for a stored decision and call `posthog.opt_in_capturing()` if consent was previously granted. This means PostHog loads (so the instance exists) but captures nothing until consent is given.

2. **`src/components/cookie-consent.tsx`** — a `"use client"` component that:
   - On mount, reads `localStorage.getItem("perflabs-analytics-consent")`.
   - If the value is `"granted"` or `"denied"`, renders nothing (decision already made).
   - Otherwise renders a bottom-fixed banner with "Accept" and "Decline" buttons.
   - "Accept": writes `"granted"` to localStorage, calls `posthog.opt_in_capturing()`, hides the banner.
   - "Decline": writes `"denied"` to localStorage, calls `posthog.opt_out_capturing()`, hides the banner.
   - Respects `prefers-reduced-motion` for any entry animation.

3. **`src/app/layout.tsx`** — import and render `<CookieConsent />` inside `<ThemeProvider>`, after `{children}`. It must live in the layout so it appears on every page including the public marketing page (where unauthenticated users first land).

**Storage key**: `perflabs-analytics-consent` — value is `"granted"` | `"denied"`.

**Files changed.**

| File | Action |
|------|--------|
| `src/instrumentation-client.ts` | Edit — add `opt_out_capturing_by_default: true`, add localStorage check |
| `src/components/cookie-consent.tsx` | Create |
| `src/app/layout.tsx` | Edit — render `<CookieConsent />` |
| `docs/analytics-consent.md` | Create (feature reference) |

**Edge cases.**
- SSR: the component must check `typeof window !== "undefined"` before reading localStorage, or use a `useEffect` so the banner only renders after hydration. Prefer `useEffect` to avoid hydration mismatch — the banner appears slightly after initial paint, which is acceptable.
- If `NEXT_PUBLIC_POSTHOG_KEY` is not set, the component renders nothing (PostHog is never initialized).
- The banner must not block page interaction — use a fixed bottom overlay, not a modal.

---

## P0-3 — Per-User Resource Limits

**Problem.** No caps exist on how many sites, monitors, or integrations a user can create. A single user (or a bot) could register thousands of monitors, flooding the BullMQ queue, exhausting the PSI API key, and growing the database without bound.

**What to build.**

1. **`src/lib/limits.ts`** — a single source of truth for all resource caps:
   ```
   MAX_SITES_PER_USER     = 25
   MAX_MONITORS_PER_SITE  = 5
   MAX_INTEGRATIONS_PER_USER = 10
   ```
   Keep these as plain constants (not env vars) — they are business rules, not deployment config. Changing them requires a code change and PR review, which is intentional.

2. **`POST /api/sites`** — after auth, before creating: count existing sites for the user. If `>= MAX_SITES_PER_USER`, return 422 with a clear message.

3. **`POST /api/monitors`** — after auth, before creating: count existing monitors for the site. If `>= MAX_MONITORS_PER_SITE`, return 422.

4. **`POST /api/integrations`** — after auth, before creating: count existing integrations for the user. If `>= MAX_INTEGRATIONS_PER_USER`, return 422.

**Files changed.**

| File | Action |
|------|--------|
| `src/lib/limits.ts` | Create |
| `src/app/api/sites/route.ts` | Edit — enforce `MAX_SITES_PER_USER` |
| `src/app/api/monitors/route.ts` | Edit — enforce `MAX_MONITORS_PER_SITE` |
| `src/app/api/integrations/route.ts` | Edit — enforce `MAX_INTEGRATIONS_PER_USER` |
| `docs/resource-limits.md` | Create (feature reference) |

**HTTP response for limit violations**: `422 Unprocessable Entity` with body:
```json
{ "error": "Site limit reached. Maximum 25 sites per account." }
```
Match the pattern already used for the API key cap (`src/app/api/keys/route.ts:69`).

**Tests to add.**

- `src/app/api/sites/__tests__/route.test.ts` — add test: returns 422 when user is at limit.
- `src/app/api/monitors/__tests__/route.test.ts` — add test: returns 422 when site is at limit.
- `src/app/api/integrations/__tests__/route.test.ts` — add test: returns 422 when user is at limit.

---

## Execution order

Do these in sequence, not in parallel — P0-2 (PostHog restructure) touches `instrumentation-client.ts` which is sensitive and should be isolated.

1. P0-3 first — pure backend, lowest risk, easiest to test, no UI dependency.
2. P0-1 second — UI-only, no new API surface, straightforward component work.
3. P0-2 last — touches client-side initialization that must be verified carefully against real PostHog behaviour.

Each item should land as its own PR so regressions are easy to isolate.
