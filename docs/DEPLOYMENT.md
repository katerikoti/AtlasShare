# AtlasShare — Deployment

Status: **not deployed.** This is the Phase 8 target. Nothing here has been
executed against a real host yet.

## 1. Target topology

| Piece | Service | Notes |
| --- | --- | --- |
| App | Vercel (Next.js) | Node 24 runtime, Turbopack build. |
| Database | Neon Postgres | Pooled runtime URL + direct migration URL; branches per environment. |
| Email | Resend | Verified sending domain (SPF/DKIM). |
| Source | GitHub `katerikoti/AtlasShare` | `main` deploys production. |

No other services are required. No object storage, no queue, no Redis, no
headless browser.

## 2. Environments

| Environment | Branch | Database | Email | Purpose |
| --- | --- | --- | --- | --- |
| Local | — | Neon dev branch or local Postgres | Resend test sender or disabled | Development |
| Preview | any PR branch | Neon preview branch (never prod) | Resend test sender | Review |
| Production | `main` | Neon production branch | Verified domain | Real users |

Rules:

- Preview deployments must not write to the production database.
- `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` must match the deployment origin
  (Vercel preview URLs differ per deployment; use the stable branch URL or set
  per-environment values).
- Secrets live in Vercel environment variables, never in the repo.

## 3. Environment variables

See `.env.example`. Production requires all of:

```
NEXT_PUBLIC_APP_URL=https://<production-domain>
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
DIRECT_URL=postgresql://.../neondb?sslmode=require
BETTER_AUTH_SECRET=<32+ random bytes>
BETTER_AUTH_URL=https://<production-domain>
RESEND_API_KEY=re_...
EMAIL_FROM=AtlasShare <hello@<verified-domain>>
```

`TEST_DATABASE_URL` is for local/CI only and should not exist in production.

Generate the auth secret with `openssl rand -base64 32`. Rotating it signs
everyone out.

## 4. Build and release

Vercel settings:

- Framework preset: Next.js
- Install: `npm ci`
- Build: `npm run build`
- Node: 24 (matches `.nvmrc`)
- Output: Next.js default (`.next`)

Database migrations are a **release step**, not a build step:

```bash
npx prisma migrate deploy   # uses DIRECT_URL
```

Run it against production before the new deployment receives traffic, from a
trusted environment (local with production env vars, or a CI job). Never run
`prisma migrate dev` or `db push` against production. If a migration is
destructive, use expand/contract and deploy in two steps.

Build must not require runtime secrets. The app is dynamic, so no database
access happens at build time; if that changes, fix the caching model rather than
adding build-time credentials.

## 5. First deployment checklist

1. Create the Neon project and production branch; copy both connection strings.
2. Create a Resend account, add and verify the sending domain (DNS records:
   SPF, DKIM; DMARC recommended). Until then, use the test sender and your own
   address.
3. Create the Vercel project from the GitHub repo.
4. Add environment variables for Production (and Preview with a separate DB).
5. Run `prisma migrate deploy` against the production database.
6. Deploy; confirm `GET /` and `GET /api/auth/ok` (whatever health endpoint is
   appropriate) succeed.
7. Sign up with a real address; confirm the welcome email arrives and the link
   works.
8. Run the critical-path smoke test with two accounts (mark, share, accept,
   export).
9. Confirm HTTPS, security headers, and that no secret appears in the client
   bundle.
10. Tag the release and update `CHANGELOG.md` / `PROGRESS.md`.

## 6. Domain and DNS

- Add the custom domain in Vercel; follow the provided A/CNAME records.
- Wait for certificate issuance before testing auth callbacks.
- Update `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to the final origin and
  redeploy.
- Email DNS is separate from web DNS but lives on the same domain:
  - SPF must include Resend and must not exceed the DNS lookup limit.
  - DKIM keys from Resend.
  - DMARC starts at `p=none` for monitoring, then `quarantine`.
- Decide whether `www` redirects to apex or vice versa; be consistent in auth
  callbacks and email links.

## 7. Security headers

Set in `next.config.ts` or `proxy.ts` (Phase 8):

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-...'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Notes:

- Next.js injects inline bootstrap scripts; use a nonce or hash strategy per the
  Next 16 CSP guide. Start with `Content-Security-Policy-Report-Only`, fix
  violations, then enforce.
- `style-src 'unsafe-inline'` is commonly needed for React inline styles; avoid
  widening `script-src`.
- Verify the export (canvas/blob) works under the final CSP.
- Invite pages should send `Referrer-Policy: no-referrer` so tokens do not leak
  to third parties.

## 8. Caching and the service worker

- Static assets and the country dataset: long-lived, immutable, content-hashed.
- HTML and API: no CDN caching of authenticated responses.
- The service worker (Phase 7) must never cache authenticated documents or
  `/api/*`. On deploy, bump the cache version; old caches are deleted on
  activate.
- If a user has an old service worker, the update flow must not serve a stale
  authenticated page. Prefer network-first for navigations.

## 9. Rollback

1. **App:** promote the previous Vercel deployment (instant).
2. **Database:** migrations are backward compatible by policy, so the previous
   app version should still run. If not, restore a Neon branch/PITR snapshot.
3. **Secrets:** if the incident is credential-related, rotate first, then roll
   back.
4. Record what happened in `CHANGELOG.md` and `PROGRESS.md` without exposing
   secrets.

Never roll back by force-pushing `main`. Use Vercel's deployment history.

## 10. Backups and recovery

- Neon PITR/branching is the backup mechanism; confirm the retention window for
  the chosen plan and write it here once known.
- Before a risky migration, create a Neon branch as a restore point.
- Test a restore at least once before public launch (restore into a scratch
  branch, verify row counts).
- Application code and the country dataset are in git; no separate backup.

## 11. Monitoring

Phase 8 decision. Minimum viable:

- Vercel deployment and function logs.
- Uptime check on the landing page and auth endpoint (external, optional).
- Email delivery visible in the Resend dashboard.
- Error tracking is optional and must be privacy-reviewed; if added, scrub
  cookies, auth headers, and request bodies.

No analytics by default, consistent with the privacy stance.

## 12. Costs (verify current pricing before committing)

| Service | Free tier likely covers | Paid trigger |
| --- | --- | --- |
| Vercel | Hobby for development/preview | Pro for commercial use / team features |
| Neon | Free tier for early usage | Storage/compute beyond free limits |
| Resend | Free monthly email quota | Volume beyond free tier |
| Domain | — | Annual registration |

Prices and limits change; check each provider's current page rather than relying
on this table. The architecture deliberately avoids paid infrastructure beyond
these three.

## 13. Operational runbook (short)

- **Sign-ups failing:** check `DATABASE_URL`, Neon compute status, auth secret,
  and Vercel logs. Confirm migrations applied.
- **Emails not arriving:** check Resend dashboard for bounces, domain
  verification, and `EMAIL_FROM`. The action itself should have succeeded.
- **Invite link invalid:** check expiry/revocation/accepted state, and that the
  signed-in email matches the invitation.
- **Map blank:** check the dataset asset loaded (network tab), then the SVG
  `viewBox` and path data. A dataset integrity test should have caught this.
- **Suspected data leak:** rotate secrets, invalidate sessions, audit the
  authorization helper and its tests, notify affected users if needed.

## 14. What is deliberately not set up yet

- No CI pipeline (planned Phase 2/8).
- No custom domain.
- No error tracking.
- No staging environment separate from preview deployments.
- No load testing or autoscaling tuning.
