# Testing Guide

This document covers the testing infrastructure, tools, conventions, and commands for Web Performance Lab.

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Unit / Integration | [Vitest](https://vitest.dev/) | Fast TypeScript-native test runner with ESM support |
| Component | [React Testing Library](https://testing-library.com/react) | DOM-based component testing |
| DOM Environment | [happy-dom](https://github.com/nicedoc/happy-dom) | Lightweight DOM for component tests |
| Mocking | [vitest-mock-extended](https://github.com/eratio08/vitest-mock-extended) | Deep mocking for Prisma Client |
| E2E | [Playwright](https://playwright.dev/) | Browser-based end-to-end testing |
| Coverage | [@vitest/coverage-v8](https://vitest.dev/guide/coverage) | V8-based code coverage |

## Quick Start

```bash
# Run all unit / integration / component tests
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with code coverage report
pnpm test:coverage

# Run end-to-end tests (requires running app or auto-starts via config)
pnpm test:e2e

# Run E2E tests with interactive UI
pnpm test:e2e:ui
```

## Directory Structure

```
src/
  __tests__/
    helpers/
      setup.ts              # Vitest setupFiles: env vars + jest-dom matchers
      prisma-mock.ts         # Type-safe Prisma mock singleton
      auth-mock.ts           # Auth session mock helpers
      fixtures.ts            # Shared data factories for all entity types
  lib/
    __tests__/
      url-utils.test.ts      # Unit tests for URL canonicalization
      psi-parser.test.ts     # Unit tests for PSI response parsing
      metrics-compare.test.ts # Unit tests for run comparison logic
      utils.test.ts          # Unit tests for cn() utility
  app/
    api/
      sites/__tests__/route.test.ts                # Sites API integration tests
      monitors/__tests__/route.test.ts             # Monitors API integration tests
      monitors/[id]/run/__tests__/route.test.ts    # Run trigger API tests
      scheduler/tick/__tests__/route.test.ts       # Scheduler endpoint tests
  components/
    __tests__/
      score-badge.test.tsx    # ScoreBadge and MetricBadge component tests
      site-form.test.tsx      # SiteForm dialog + validation tests
      run-button.test.tsx     # RunButton interaction tests
  worker/
    __tests__/
      processor.test.ts      # Worker job processor tests
e2e/
  helpers/
    seed.ts                   # Database seed/cleanup for E2E (test user, site, monitor, run)
  auth.setup.ts               # Playwright setup: seeds DB, forges JWT, saves storageState
  auth.spec.ts                # Authentication flow E2E tests (unauthenticated)
  dashboard.spec.ts           # Dashboard page E2E tests (authenticated + unauthenticated)
  api.spec.ts                 # API endpoint E2E tests (authenticated + unauthenticated)
  runs.spec.ts                # Run and site detail E2E tests (authenticated + unauthenticated)
  tsconfig.json               # Separate TS config for E2E (moduleResolution: node)
```

## Configuration Files

- **`vitest.config.ts`** -- Vitest configuration with `happy-dom`, `@/*` path aliases, setup files, and v8 coverage.
- **`playwright.config.ts`** -- Playwright configuration targeting Chromium with auto-starting `pnpm dev`.
- **`.env.test`** -- Test environment variables with `SKIP_ENV_VALIDATION=1` and dummy service credentials.

## Test Categories

### Unit Tests

Pure function tests with zero external dependencies. Located in `src/lib/__tests__/`.

**What to test:**
- Input/output transformations
- Edge cases and error handling
- Return value correctness

**Example:**
```typescript
import { canonicalizeUrl } from "@/lib/url-utils";

it("upgrades http to https for non-localhost URLs", () => {
  expect(canonicalizeUrl("http://example.com")).toBe("https://example.com/");
});
```

### Integration Tests (API Routes)

Test Next.js API route handlers with mocked database and auth. Located alongside routes in `__tests__/` directories.

**Key patterns:**
- Import route handlers directly (`import { GET, POST } from "./route"`)
- Construct `NextRequest` objects manually
- Mock Prisma via the shared `prismaMock` helper
- Mock auth via `mockAuthenticated()` / `mockUnauthenticated()`

**Example:**
```typescript
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { mockAuthenticated } from "@/__tests__/helpers/auth-mock";
import { GET } from "@/app/api/sites/route";

it("returns 401 when unauthenticated", async () => {
  mockUnauthenticated();
  const res = await GET(new NextRequest("http://localhost:3000/api/sites"));
  expect(res.status).toBe(401);
});
```

### Component Tests

React component tests using Testing Library. Located in `src/components/__tests__/`.

**Key patterns:**
- Render components with `render(<Component />)`
- Query DOM with accessible roles and text
- Simulate user interactions with `userEvent`
- Mock `next/navigation` and `fetch` as needed

**Example:**
```typescript
import { render, screen } from "@testing-library/react";
import { ScoreBadge } from "@/components/score-badge";

it("renders the rounded score", () => {
  render(<ScoreBadge score={85.7} />);
  expect(screen.getByText("86")).toBeInTheDocument();
});
```

### E2E Tests

Browser-based tests using Playwright. Located in `e2e/`.

**Key patterns:**
- Tests run against the live Next.js dev server (auto-started by Playwright)
- A **setup project** (`e2e/auth.setup.ts`) runs first to seed the database and forge a JWT session
- Authenticated specs automatically load the saved session from `e2e/.auth/user.json`
- Unauthenticated specs opt out with `test.use({ storageState: { cookies: [], origins: [] } })`
- Use `page.goto()` for navigation, `request` API for direct HTTP calls

**Authentication setup flow:**
1. `auth.setup.ts` seeds a test user, site, monitor, and run into the real database via Prisma
2. Encodes a JWT using `next-auth/jwt`'s `encode()` with the app's `NEXTAUTH_SECRET`
3. Sets the `authjs.session-token` cookie in the browser context
4. Saves the storage state so all authenticated specs reuse it

**Example (unauthenticated):**
```typescript
test.use({ storageState: { cookies: [], origins: [] } });

test("GET /api/sites returns 401 without auth", async ({ request }) => {
  const response = await request.get("/api/sites");
  expect(response.status()).toBe(401);
});
```

**Example (authenticated -- uses saved session automatically):**
```typescript
test("dashboard displays the seeded site", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("E2E Test Site")).toBeVisible();
});
```

## Test Helpers

### `prisma-mock.ts`

Provides a type-safe deep mock of `PrismaClient` using `vitest-mock-extended`. Auto-resets between tests.

```typescript
import { prismaMock } from "@/__tests__/helpers/prisma-mock";

prismaMock.site.findMany.mockResolvedValue([...]);
```

### `auth-mock.ts`

Controls the mocked `auth()` function from `@/lib/auth`.

```typescript
import { mockAuthenticated, mockUnauthenticated } from "@/__tests__/helpers/auth-mock";

mockAuthenticated();        // Default test user session
mockUnauthenticated();      // Returns null (no session)
mockAuthenticated(custom);  // Custom session object
```

### `fixtures.ts`

Factory functions for all Prisma entity types and PSI responses.

```typescript
import { createUser, createSite, createMonitor, createRun, createAudit, createPSIResponse } from "@/__tests__/helpers/fixtures";

const site = createSite({ name: "Custom Name" });
const psi = createPSIResponse();
```

## Conventions

1. **File naming:** `*.test.ts` for unit/integration, `*.test.tsx` for components, `*.spec.ts` for E2E.
2. **Test location:** Co-located with source in `__tests__/` directories.
3. **Mock location:** Shared mocks in `src/__tests__/helpers/`.
4. **Describe blocks:** Group by function or HTTP method (`describe("GET /api/sites", ...)`).
5. **Test isolation:** Each test should be independent. Use `beforeEach` to reset mocks.
6. **Auth testing:** Always test the 401 case for every protected endpoint.
7. **Assertions:** Prefer specific assertions (`toBe`, `toContain`) over loose ones (`toBeTruthy`).

## Coverage

Run coverage with:

```bash
pnpm test:coverage
```

Coverage reports are generated in `coverage/` (gitignored) in text, HTML, and LCOV formats. The coverage configuration targets:

- `src/lib/**` -- Utility and business logic
- `src/app/api/**` -- API route handlers
- `src/components/**` -- React components (excluding `ui/` primitives)
- `src/worker/**` -- Background worker logic

## E2E Prerequisites

E2E tests run against the live application and database, so you need:

1. **Docker services running:** `docker-compose up -d` (Postgres + Redis)
2. **Database migrated:** `pnpm prisma db push`
3. **`.env` file configured** with a valid `NEXTAUTH_SECRET`

The dev server is auto-started by Playwright. If you already have `pnpm dev` running, Playwright reuses it.

## Running in CI

Both Vitest and Playwright are configured to work in CI environments:

```bash
# Unit/integration/component tests
pnpm test

# E2E tests (Playwright auto-detects CI via process.env.CI)
CI=true pnpm test:e2e
```

Playwright in CI mode:
- Retries failed tests twice
- Uses a single worker
- Produces GitHub Actions-compatible reports
- Forbids `.only` annotations
