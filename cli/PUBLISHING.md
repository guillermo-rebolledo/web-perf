# Publishing Guide

How to build, version, and publish `@perflabs/cli` to npm.

---

## Prerequisites

- Node.js 18+, pnpm 10+
- An [npmjs.com](https://www.npmjs.com) account that belongs to the `@perflabs` org
  (or create the org at npmjs.com → your profile → Add organization)
- Logged in to npm: `npm login`

---

## What gets published

The `files` field in `package.json` limits the published tarball to:

```
dist/        ← compiled JS (the only thing users need)
README.md
```

Source files, tests, and config files are never included.

---

## Step-by-step

### 1. Keep types in sync

`cli/src/types/api.ts` is a local copy of `src/types/api.ts` from the web app. If you add or change API response shapes, update **both** files.

### 2. Bump the version

Follow [semver](https://semver.org):

| Change | Version bump | Example |
|---|---|---|
| New command / flag | minor | `0.1.0 → 0.2.0` |
| Breaking change (removed flag, renamed command) | major | `0.1.0 → 1.0.0` |
| Bug fix, copy change | patch | `0.1.0 → 0.1.1` |

```sh
# from cli/
npm version patch   # or minor / major
```

This updates `package.json` and creates a git tag automatically.

### 3. Build and publish

```sh
# from cli/
npm publish
```

The `prepublishOnly` script runs `pnpm build` automatically before publishing, so the tarball always contains a fresh build.

To do a dry run first (prints what would be published without actually uploading):

```sh
npm publish --dry-run
```

### 4. Verify

```sh
# Check the published package on npm
npm info @perflabs/cli

# Smoke-test with pnpm dlx (downloads and runs without installing)
pnpm dlx @perflabs/cli --help
```

---

## How users install it

### One-off (no install)

```sh
pnpm dlx @perflabs/cli auth
npx @perflabs/cli sites list
```

### Global install (adds `side` to PATH)

```sh
pnpm add -g @perflabs/cli
# or
npm install -g @perflabs/cli

side auth
side sites list
side run --url https://example.com
```

---

## Troubleshooting

**`npm publish` fails with 402 Payment Required**
The `@perflabs` org must exist on npm and your account must be a member. Scoped packages default to private — the `"publishConfig": { "access": "public" }` in `package.json` overrides this.

**`npm publish` fails with 403 Forbidden**
Run `npm login` again. Your token may have expired.

**`pnpm dlx @perflabs/cli` runs an old version**
pnpm caches dlx packages. Run with `--ignore-existing` to force a fresh download:

```sh
pnpm dlx --ignore-existing @perflabs/cli --help
```
