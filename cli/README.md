# @perflabs/cli — Web Performance Lab CLI

A thin REST client for Web Performance Lab. Trigger PSI runs, inspect results, and manage sites
and monitors — all without leaving the terminal.

---

## Architecture

```
cli/
├── src/
│   ├── index.ts             # cac root; registers sub-commands
│   ├── config.ts            # Conf-based persistent config (~/.config/side-cli/)
│   ├── client.ts            # fetch wrapper; injects Authorization: Bearer
│   ├── format.ts            # formatMs, formatCls, formatCadence, formatRelative, scoreColor, severityColor
│   ├── format.test.ts       # Vitest unit tests for all format utilities
│   ├── ui.tsx               # ink React components (tables, run result display)
│   └── commands/
│       ├── auth.ts          # side auth — browser device flow (@clack/prompts)
│       ├── sites.tsx        # side sites list | add (@clack/prompts + ink)
│       ├── monitors.tsx     # side monitors list | add (@clack/prompts + ink)
│       └── run.tsx          # side run — trigger, poll, display (@clack/prompts + ink)
├── eslint.config.mjs        # ESLint flat config (typescript-eslint)
├── vitest.config.ts         # Vitest config scoped to cli/src
├── package.json
├── tsconfig.json
└── README.md
```

**Library stack:**
- **[cac](https://github.com/cacjs/cac)** — lightweight argument parser; replaces commander
- **[@clack/prompts](https://github.com/bombshell-dev/clack)** — structured terminal UX: spinners, intro/outro, log levels
- **[ink](https://github.com/vadimdemedes/ink)** — React renderer for the terminal; drives rich table and results display

The CLI speaks **pure HTTP** to the existing Next.js API routes. It has no direct database access —
all heavy lifting (PSI fetch, regression detection, rate limiting) stays on the server.

Shared TypeScript interfaces live in `src/types/api.ts` (a local copy kept in sync with the web
app). They are imported via `import type`, which TypeScript erases at emit — zero runtime overhead.

---

## Auth — Browser Device Flow

The `side auth` command uses an experience modelled after `gh auth login`: the CLI never handles
your credentials directly.

```
┌─ CLI ─────────────────────────────────────────┐
│  POST /api/cli/login                           │
│    ← { loginCode, authorizeUrl }               │
│  open(authorizeUrl) → browser opens            │
│  poll GET /api/cli/login?code=XXXX every 2s    │
│    ← { status: "authorized", apiKey, email }   │
│  saveConfig({ baseUrl, apiKey, email })         │
└────────────────────────────────────────────────┘
```

**Server side:**
- `POST /api/cli/login` generates a short login code (`nanoid(8)`), stores
  `{ status: "pending" }` in Redis under key `cli:login:{code}` with a 10-minute TTL, and
  returns `{ loginCode, authorizeUrl, expiresInSeconds }`.
- The browser opens `/cli/authorize?code=XXXX`. The page requires NextAuth session
  (redirects to sign-in if unauthenticated), validates the Redis key, and shows the user their
  email plus an "Authorize CLI" button.
- On click a Server Action calls `generateApiKey()`, stores the `ApiKey` record (SHA-256 hash
  only, 90-day expiry), and updates the Redis key to
  `{ status: "authorized", apiKey: "<raw>", email }`.
- `GET /api/cli/login?code=XXXX` (polled by CLI) reads the Redis state and, on `"authorized"`,
  deletes the key (single-use) before returning the raw key.

The raw key is transmitted exactly once, then discarded. Only its SHA-256 hash is stored.

---

## Commands Reference

| Command | Description |
|---|---|
| `side auth [--url]` | Browser device flow — opens browser, polls, saves key |
| `side sites list` | ASCII table of all sites |
| `side sites add <url>` | Create site; `--monitor` also creates monitor |
| `side monitors list --site <id>` | List monitors |
| `side monitors add --site <id>` | Create monitor |
| `side run [monitorId\|--url]` | Trigger run, poll, print scores + CWV + regressions |

---

### `side auth [--url <baseUrl>]`

Authenticate via browser device flow. `--url` defaults to `http://localhost:3000` for local dev;
set `SIDE_BASE_URL` env var instead of repeating `--url` every time.

```sh
side auth
side auth --url https://yourapp.com
SIDE_BASE_URL=https://yourapp.com side auth
```

After authentication, config is saved to `~/.config/side-cli/config.json`:

```json
{ "baseUrl": "https://yourapp.com", "apiKey": "side_…", "email": "you@example.com" }
```

---

### `side sites list`

List all sites for the authenticated user.

```sh
side sites list
```

Output:
```
◆  side sites list
✓  2 sites found

  ╭──────────────────────────────────────────────────────╮
  │ 2 sites · 3 monitors                                 │
  │ Use a monitor id with side run <monitorId> to        │
  │ trigger an audit.                                    │
  ╰──────────────────────────────────────────────────────╯

  My Blog                           https://myblog.com
    id       cm9abc123efg456hijklmn
    monitor  cm9mon111aaabbbcccddd   mobile   every 1d    ● active   in 2h
    monitor  cm9mon222eeefffoooggg   desktop  every 12h   ● active   in 45m

  ────────────────────────────────────────────────────────

  Example Site                      https://example.com
    id       cm9xyz789efg012hijklmn
    no monitors — run side monitors add --site cm9xyz789efg012hijklmn

◇  side run <monitorId>  ·  side monitors add --site <siteId>
```

Each site card shows:
- Site name, URL, and ID (for use with `side monitors add`)
- Each monitor's ID (for use with `side run`), strategy, cadence, status, and time until next scheduled run

---

### `side sites add <url> [--name <name>] [--monitor]`

Create a new site. `--name` defaults to the hostname. `--monitor` also creates a default mobile
monitor and triggers an initial run.

```sh
side sites add https://example.com --name "Example" --monitor
```

---

### `side monitors list --site <siteId>`

List monitors for a site.

```sh
side monitors list --site cm9abc123
```

---

### `side monitors add --site <siteId> [--strategy mobile|desktop] [--cadence <minutes>]`

Create a monitor. Cadence defaults to 1440 (daily), strategy defaults to `mobile`.

```sh
side monitors add --site cm9abc123 --strategy desktop --cadence 720
```

---

### `side run [monitorId] [--url <siteUrl>]`

Trigger an on-demand PSI run and stream results back to the terminal.

```sh
side run cm9monitor456
side run --url https://example.com
```

**If a run is already in progress** (HTTP 409), the CLI recovers gracefully and polls the
existing run instead of failing.

**Example output:**

```
✓ Run queued (ID: cm9xyz456)
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

Full results: https://yourapp.com/runs/cm9xyz456
```

---

## Shared Types Contract

All API response shapes are defined in `src/types/api.ts` (local copy of `../src/types/api.ts`
from the web app). The CLI imports them as:

```ts
// cli/src/commands/run.tsx
import type { RunSummary, RunRegressionsResult } from "../types/api.js";
```

These are `import type` statements — fully erased at emit, with zero runtime cost.

Rules:
- Adding a new field to an API response → update **both** `src/types/api.ts` files → TypeScript
  flags mismatches in CLI code at build time.
- The CLI never imports from Prisma, Next.js, or any server-only module.

---

## Building and Running Locally

### Prerequisites

- Node.js 20+
- pnpm 10+
- A running Web Performance Lab instance (local or remote)

### Install and build

```sh
# From repo root — installs workspace including cli/
pnpm install

# Build the CLI
pnpm cli:build

# Or watch mode for development
pnpm cli:dev
```

### Lint and test

```sh
# Lint CLI source
pnpm cli:lint

# Run unit tests
pnpm cli:test

# Watch mode
pnpm cli:test:watch
```

Tests live alongside source in `src/format.test.ts`. Run them from the CLI package directly with `pnpm test` if you prefer to work inside `cli/`.

For versioning and publishing to npm, see [PUBLISHING.md](./PUBLISHING.md).

### Run the built binary

```sh
node cli/dist/index.js auth
# or link globally:
cd cli && pnpm link --global
side auth
```

### Development workflow

```sh
# Terminal 1 — run the app
pnpm dev:all

# Terminal 2 — watch-build CLI
pnpm cli:dev

# Terminal 3 — use the CLI against local instance
node cli/dist/index.js auth --url http://localhost:3000
node cli/dist/index.js sites list
node cli/dist/index.js run --url http://localhost:3000
```

---

## API Keys (Web UI)

Keys created by `side auth` are visible and revocable from **Settings → API Keys** in the web app.
Each key shows its prefix, last-used timestamp, and expiry. You can also create named keys
manually from the UI (useful for CI pipelines).

Limits: 10 keys per user. Expiry is 90 days for CLI auto-authorized keys; custom expiry (1–365 days)
when created manually.

---

## CI/CD Usage

For non-interactive environments (GitHub Actions, etc.) create a named key from the web UI and
store it as a secret:

```yaml
- name: Trigger performance run
  env:
    SIDE_API_KEY: ${{ secrets.SIDE_API_KEY }}
    SIDE_BASE_URL: https://yourapp.com
  run: |
    node cli/dist/index.js run ${{ env.MONITOR_ID }}
```

The CLI reads `Authorization: Bearer $SIDE_API_KEY` automatically when `SIDE_BASE_URL` and the key
are provided via config or by passing `--url` and setting the API key in config first.

For CI it is simpler to call the API directly:

```sh
curl -X POST https://yourapp.com/api/monitors/$MONITOR_ID/run \
  -H "Authorization: Bearer $SIDE_API_KEY" \
  -H "Content-Type: application/json"
```

---

## Notes for New Developers

- **`src/lib/api-key-auth.ts`** — `generateApiKey`, `hashApiKey`, `resolveApiKeyUser`
- **`src/lib/resolve-user.ts`** — used by all API routes; checks Bearer header before session
- **`src/app/api/cli/login/route.ts`** — device flow endpoints (POST + GET)
- **`src/app/cli/authorize/page.tsx`** — browser authorization UI (Server Component + Server Action)
- **`src/app/api/keys/route.ts`** — list/create keys (10-key cap enforced)
- **`src/app/api/keys/[id]/route.ts`** — revoke a key
- **`src/app/settings/page.tsx`** — Settings page (Server Component)
- **`src/components/api-key-manager.tsx`** — Client Component with create/revoke UI
