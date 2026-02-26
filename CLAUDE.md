# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (always run both together)
pnpm dev:all          # Next.js + background worker concurrently
pnpm dev              # Next.js only
pnpm dev:worker       # Worker only

# Testing
pnpm test             # Vitest unit/integration/component tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm test:e2e         # Playwright E2E tests

# Run a single test file
pnpm test src/components/__tests__/alerts-list.test.tsx

# Code quality
pnpm lint
pnpm tsc --noEmit

# Database
pnpm seed:regressions  # Seed regression alert test data

# Infrastructure (PostgreSQL + Redis)
docker compose up -d
```

## Architecture

This is a **web performance monitoring SaaS** built with Next.js 15 App Router. The system periodically fetches Google PageSpeed Insights (PSI) scores for user-registered sites and detects performance regressions.

### Two-Process Design

The app runs as two separate processes:
1. **Next.js server** (`src/app/`) — API routes and UI
2. **BullMQ worker** (`src/worker/`) — Background job processor that fetches PSI scores and detects regressions

Jobs are enqueued via BullMQ/Redis. The scheduler (`src/worker/scheduler.ts`) uses cron to trigger runs based on each Monitor's `cadenceMinutes` and `nextRunAt`.

### Data Flow

```
User creates Site → Monitor → Scheduler enqueues Run job
→ Worker fetches PSI → psi-parser.ts extracts metrics
→ regression/detector.ts compares to RegressionBaseline
→ RegressionAlert saved → UI shows alerts
```

### Key Concepts

- **Site**: A URL to monitor (belongs to a User)
- **Monitor**: Configuration for a site (cadence, mobile/desktop strategy)
- **Run**: One PSI audit result with all metrics, audits, and screenshots
- **RegressionBaseline**: Rolling median of recent runs per metric per monitor
- **RegressionAlert**: Detected metric regression with severity, root cause, and diff summary

### Regression Detection System (`src/lib/regression/`)

The most complex part of the codebase:
- `detector.ts` — compares current run metrics against baselines
- `baseline-calculator.ts` — computes rolling medians
- `rules-engine.ts` — runs specialized rules for root cause analysis
- `diff-engine.ts` — produces before/after deltas across network/rendering/main thread
- `rules/` — 8 specialized rules (render-blocking, CLS, third-party, LCP, legacy JS, JS bloat, main thread, TTFB)

### API Routes (`src/app/api/`)

All routes require authentication (NextAuth session). Notable patterns:
- Manual run trigger (`POST /api/monitors/[id]/run`) has Redis-based rate limiting
- Alerts endpoint (`GET /api/alerts`) uses cursor-based pagination
- Scheduler endpoint (`POST /api/scheduler/tick`) requires `x-scheduler-secret` header

### Environment Validation

All env vars are validated at startup via `src/env.js` (T3 Env pattern). Check this file when adding new environment variables.

### Testing Conventions

- **Unit/Integration**: Vitest with happy-dom, files at `src/**/*.test.{ts,tsx}`
- **Prisma mocking**: Use `src/__tests__/helpers/prisma-mock.ts` (vitest-mock-extended singleton)
- **Test fixtures**: `src/__tests__/helpers/fixtures.ts` for data factories
- **E2E**: Playwright in `e2e/`, seeds DB via `e2e/helpers/seed.ts`, stores auth state

### UI Stack

- Tailwind CSS 4 + shadcn/ui components in `src/components/ui/`
- Recharts for performance timeline charts
- Sonner for toast notifications
- Dark mode via next-themes

### Path Alias

`@/*` maps to `src/*` (configured in tsconfig.json).

## TypeScript Best Practices

- **Prefer `unknown` over `any`** — forces explicit narrowing before use
- **`interface` for object shapes, `type` for unions and complex types** — better error messages and flexibility respectively
- **Leverage inference** — don't annotate what TypeScript can infer
- **Discriminated unions over optional fields** — enables exhaustive narrowing in switch/if chains
- **Type guards over type assertions** — use `value is T` predicates instead of `as T` casts
- **Strict mode always on** — all strict compiler options must remain enabled (`tsconfig.json`)
- **Avoid deeply nested conditional/recursive types** — they slow compilation; flatten or cache intermediate types
- **Use `const` assertions** (`as const`) to preserve literal types in configuration objects and lookup tables
- **Document complex generic types** with JSDoc — anything non-obvious warrants a comment
- **Never use `any` in new code** — if interacting with a third-party type that returns `any`, narrow it immediately

> Full reference with patterns and examples: `.agents/skills/typescript-advanced-types/SKILL.md`

## Frontend Design Guidelines

### Quality Bar
UI work in this project follows production-grade standards. Avoid generic "AI slop" aesthetics — every component should feel intentionally designed for a performance monitoring tool.

### Typography
- Choose distinctive fonts; avoid Inter, Roboto, Arial, or system-ui defaults
- Pair a display/heading font with a refined body font
- Use CSS variables for font stacks so themes stay consistent

### Color & Theme
- Commit to a cohesive palette — dominant base colors with sharp accents
- Define all colors as CSS custom properties; never hardcode hex values in component JSX
- Avoid cliché schemes (purple-gradient-on-white is banned)

### Motion
- Prefer CSS-only animations for simple transitions; use the Motion library for complex React sequences
- One well-orchestrated page-load stagger beats scattered micro-interactions — be selective
- Hover states and scroll-triggered reveals should surprise, not distract

### Layout & Composition
- Prefer intentional asymmetry and generous negative space over default centered stacks
- Break out of the grid where it adds impact; don't default to uniform card grids
- Spatial rhythm matters: consistent spacing scale (Tailwind's scale) everywhere

### Backgrounds & Depth
- Build atmosphere with gradient meshes, subtle noise textures, or layered transparencies
- Dramatic shadows and decorative borders beat flat/borderless defaults
- Solid backgrounds are a last resort — add at least subtle depth

### Accessibility
- All interactive elements must have keyboard focus styles
- Color contrast must meet WCAG AA minimum
- Motion must respect `prefers-reduced-motion`
- Use semantic HTML elements; ARIA only when semantics fall short

### Code Reviews
Use the `web-design-guidelines` skill (`/web-design-guidelines`) to audit UI files against Vercel's Web Interface Guidelines before considering UI work complete.

> Full design reference: `.agents/skills/frontend-design/SKILL.md`
> Web interface guidelines skill: `.agents/skills/web-design-guidelines/SKILL.md`

## Copywriting

When writing or improving marketing copy — homepage, landing pages, pricing, feature pages, or any product page — use the `copywriting` skill (`/copywriting`).

Before writing, check for `.claude/product-marketing-context.md`. If it exists, read it first to get product/audience context without asking redundant questions.

> Full copywriting guide: `.agents/skills/copywriting/SKILL.md`
> Copy frameworks reference: `.agents/skills/copywriting/references/copy-frameworks.md`
> Natural transitions reference: `.agents/skills/copywriting/references/natural-transitions.md`

## React & Next.js Performance (Vercel Guidelines)

Apply these rules when writing or reviewing React components, Next.js pages, data fetching, or anything that affects bundle size or runtime performance.

| Priority | Category | Prefix |
|----------|----------|--------|
| CRITICAL | Eliminating Waterfalls | `async-` |
| CRITICAL | Bundle Size Optimization | `bundle-` |
| HIGH | Server-Side Performance | `server-` |
| MEDIUM-HIGH | Client-Side Data Fetching | `client-` |
| MEDIUM | Re-render Optimization | `rerender-` |
| MEDIUM | Rendering Performance | `rendering-` |
| LOW-MEDIUM | JavaScript Performance | `js-` |
| LOW | Advanced Patterns | `advanced-` |

### Must-follow rules (CRITICAL)

**Waterfalls**
- Use `Promise.all()` for independent async operations — never await them sequentially
- Start promises early, await late inside API routes and Server Components
- Use Suspense boundaries to stream content instead of blocking the full page

**Bundle size**
- Import directly from source, not from barrel/index files
- Use `next/dynamic` for heavy components not needed on initial load
- Load analytics, logging, and other non-critical third-party scripts after hydration

**Server components**
- Use `React.cache()` for per-request deduplication of expensive calls
- Minimize data serialized into RSC props — pass only what the client component needs
- Parallelize server fetches by restructuring component trees, not co-locating awaits

**Re-renders**
- Derive state during render instead of syncing it through effects
- Use `useRef` for transient, frequently-changing values that don't affect layout
- Use functional `setState` callbacks to keep state-updater functions stable
- Avoid `&&` for conditional rendering — use ternary with `null` to prevent falsy renders

> Full rules with examples: `.claude/skills/vercel-react-best-practices/SKILL.md`
> Complete compiled guide (all 57 rules): `.claude/skills/vercel-react-best-practices/AGENTS.md`
> Individual rule files: `.claude/skills/vercel-react-best-practices/rules/`
