# Resource Limits

This document describes the per-user resource caps enforced by the API.

---

## Limits

All limits are defined as constants in `src/lib/limits.ts`. They are **not** environment variables — they are business rules that require a code change and PR review to modify.

| Resource | Constant | Default |
|----------|----------|---------|
| Sites per user | `MAX_SITES_PER_USER` | 25 |
| Monitors per site | `MAX_MONITORS_PER_SITE` | 5 |
| Integrations per user | `MAX_INTEGRATIONS_PER_USER` | 10 |

There is also a pre-existing limit enforced separately:

| Resource | Constant | Location |
|----------|----------|----------|
| API keys per user | `MAX_KEYS = 10` | `src/app/api/keys/route.ts` |

---

## Enforcement

Limits are checked server-side inside the relevant `POST` handler, after authentication and before the database write.

### Sites (`POST /api/sites`)

```ts
const count = await prisma.site.count({ where: { userId } });
if (count >= MAX_SITES_PER_USER) {
  return NextResponse.json(
    { error: `Site limit reached. Maximum ${MAX_SITES_PER_USER} sites per account.` },
    { status: 422 },
  );
}
```

### Monitors (`POST /api/monitors`)

```ts
const count = await prisma.monitor.count({ where: { siteId: validated.siteId } });
if (count >= MAX_MONITORS_PER_SITE) {
  return NextResponse.json(
    { error: `Monitor limit reached. Maximum ${MAX_MONITORS_PER_SITE} monitors per site.` },
    { status: 422 },
  );
}
```

### Integrations (`POST /api/integrations`)

```ts
const count = await prisma.integration.count({ where: { userId } });
if (count >= MAX_INTEGRATIONS_PER_USER) {
  return NextResponse.json(
    { error: `Integration limit reached. Maximum ${MAX_INTEGRATIONS_PER_USER} integrations per account.` },
    { status: 422 },
  );
}
```

---

## HTTP response

All limit violations return `422 Unprocessable Entity` — consistent with the existing API key cap pattern.

---

## Rationale for defaults

| Limit | Reasoning |
|-------|-----------|
| 25 sites | Generous enough for power users monitoring a whole portfolio of sites. Beyond 25, PSI quota and scheduled run volume become a concern per user. |
| 5 monitors per site | One mobile + one desktop monitor is the typical case. 5 leaves room for multiple deployment monitors on the same site without allowing runaway growth. |
| 10 integrations | Matches the API key limit. 10 Slack webhooks per user is already more than any realistic use case. |

---

## Changing limits

Edit `src/lib/limits.ts`. The constant name and value are the only things that need to change — the enforcement logic in each API route references the constant directly.

Consider whether raising a limit materially changes infrastructure load before approving the PR:
- Raising `MAX_SITES_PER_USER` increases scheduled run volume proportionally.
- Raising `MAX_MONITORS_PER_SITE` does the same.
- Raising `MAX_INTEGRATIONS_PER_USER` increases outbound HTTP calls per audit.

---

## Future: per-plan limits

If a paid tier is introduced, limits can be made plan-aware by:
1. Adding a `plan` field to the `User` model.
2. Replacing the constant check with a `getLimitForPlan(plan, "sites")` lookup that returns different values per tier.
3. The `src/lib/limits.ts` file becomes the limit configuration table.
