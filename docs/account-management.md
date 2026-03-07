# Account Management

This document covers the account self-service features available to users: data export and account deletion.

Both features are GDPR requirements:
- **Export** — Art. 20 Right to data portability
- **Deletion** — Art. 17 Right to erasure

---

## Data export

**UI location:** Settings → Account → Export data button

**API:** `GET /api/user/export`

Returns a JSON file (`perflabs-export-<userId>.json`) containing all data associated with the authenticated user:

- Profile (id, email, name, createdAt, weeklyDigestEnabled)
- Sites with all monitors and the 1,000 most recent runs per monitor
- Regression alerts for those runs
- Integrations (name, type — webhook URLs are excluded)
- API keys (id, name, prefix, dates — hashes are excluded)

**Excluded fields:**
- `screenshotData` — large binary, not portable
- OAuth tokens, session tokens — security-sensitive
- `keyHash` — not portable
- Integration `config.webhookUrl` — security-sensitive

**Client flow in `AccountSection`:**

```
fetch("GET /api/user/export")
  → res.blob()
  → URL.createObjectURL(blob)
  → <a download="perflabs-export.json"> click → revoke URL
```

---

## Account deletion

**UI location:** Settings → Account → Delete account button → AlertDialog → Confirm

**API:** `DELETE /api/user`

**Two-path flow depending on whether Resend is configured:**

### With Resend (production)

1. `DELETE /api/user` → generates a 24-hour HMAC token → sends a confirmation email → returns `202 Accepted`.
2. User clicks the link in the email: `GET /api/user/confirm-delete?token=<token>`.
3. Token is verified (HMAC + expiry check in `src/lib/delete-account-token.ts`).
4. `prisma.user.delete()` — cascades to all related data (sites, monitors, runs, alerts, API keys, integrations, sessions).
5. Redirects to `/?deleted=1`.

The UI should show a toast on 202: "Check your email — we sent you a confirmation link."

### Without Resend (dev / self-hosted)

1. `DELETE /api/user` → `prisma.user.delete()` immediately → returns `204 No Content`.
2. UI calls `signOut({ callbackUrl: "/" })`.

### Cascade behavior

All user data is deleted via Prisma `onDelete: Cascade` relations. No manual deletion queries are needed. The delete touches:

```
User
  └── Site (Cascade)
        └── Monitor (Cascade)
              ├── Run (Cascade)
              │     ├── Audit (Cascade)
              │     ├── Insight (Cascade)
              │     └── RegressionAlert (Cascade)
              ├── RegressionBaseline (Cascade)
              └── MonitorIntegration (Cascade)
  ├── Account (Cascade)        — OAuth provider links
  ├── Session (Cascade)        — active sessions
  ├── ApiKey (Cascade)
  └── Integration (Cascade)
        └── MonitorIntegration (Cascade)
```

---

## Token implementation

`src/lib/delete-account-token.ts`

- Token format (base64url): `<userId>:<issuedAt>:<hmac-hex>`
- HMAC-SHA256 signed with `NEXTAUTH_SECRET`
- 24-hour expiry enforced at verification time
- Constant-time comparison prevents timing oracle attacks

---

## Key files

| File | Role |
|------|------|
| `src/components/account-section.tsx` | UI (export button + delete dialog) |
| `src/app/(app)/settings/page.tsx` | Renders `<AccountSection />` in the Account section |
| `src/app/api/user/route.ts` | `DELETE /api/user` — initiates deletion |
| `src/app/api/user/confirm-delete/route.ts` | `GET /api/user/confirm-delete` — completes deletion |
| `src/app/api/user/export/route.ts` | `GET /api/user/export` — data dump |
| `src/lib/delete-account-token.ts` | Token generation + verification |
