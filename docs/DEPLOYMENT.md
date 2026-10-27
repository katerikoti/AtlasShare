# AtlasShare — Deployment

Status: **not deployed.** This is the Phase 8 target. Nothing here has been
executed against a real host yet. Phases 2–6 are implemented locally; a Neon dev
branch is connected and both migrations are applied, and Brevo has delivered
test email. The export is client-side and adds no server service.

## 1. Target topology

| Piece | Service | Notes |
| --- | --- | --- |
| App | Vercel (Next.js) | Node 24 runtime, Turbopack build. |
| Database | Neon Postgres | Pooled runtime URL + direct migration URL; branches per environment. A 30-day branch expiration is an auto-delete timer, not a usage limit. |
| Email | Brevo | Verified sender for practice; authenticated domain (SPF/DKIM) recommended for production. |
| Source | GitHub `katerikoti/AtlasShare` | `main` deploys production. |

No other services are required. No object storage, no queue, no Redis, no
headless browser.

## 2. Environments

| Environment | Branch | Database | Email | Purpose |
| --- | --- | --- | --- | --- |
| Local | — | Local PostgreSQL 18 or a Neon dev branch | Brevo verified sender or disabled | Development |
| Preview | any PR branch | Neon preview branch (never prod) | Brevo verified sender | Review |
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
BREVO_API_KEY=xkeysib-...
EMAIL_FROM=AtlasShare <verified-sender@example.com>
```

`TEST_DATABASE_URL` is for local/CI only and should not exist in production.

Generate the auth secret with `openssl rand -base64 32`. Rotating it signs
everyone out.

Brevo IP blocking: local setup may return `401 unauthorized` until the current
egress IP is authorized. Vercel's outbound IPs are dynamic, so production needs
one of: IP blocking disabled for the production key, a static egress proxy, or a
scoped M2M token. M2M would require changing the mailer from an `api-key` header
to an OAuth bearer token; decide before deployment.

Brevo adds a `List-Unsubscribe` header to transactional email even when the body
has no unsubscribe link, so Gmail may show an unsubscribe button and may place
unauthenticated mail in Promotions. The free plan cannot replace this with a
`List-Help` header; Enterprise support can for eligible transactional mail.
Authenticate a sending domain to improve Primary-tab placement. Do not click the
Gmail unsubscribe control during testing unless you intend to suppress future
AtlasShare email.

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
2. Create a Brevo account, add and verify a sender address (six-digit code). A
   domain is optional for practice. For production, authenticate the sending
   domain (DNS records: SPF, DKIM; DMARC recommended) for reliable delivery.3. Create the Vercel project from the GitHub repo.
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
  - SPF must include Brevo and must not exceed the DNS lookup limit.
  - DKIM keys from Brevo.
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
- Verify the export (canvas/blob) works under the final CSP; it uses a blob URL
  for the SVG and canvas, so `img-src`/`connect-src` must allow what the final
  policy requires. The current Phase 6 browser QA ran without a production CSP.
- Invite pages should send `Referrer-Policy: no-referrer` so tokens do not leak
  to third parties.

## 8. Caching and the service worker

- JS/CSS build assets: long-lived and immutable; Next.js content-hashes them.
- `/map/countries.json`: public but **unversioned**. Local production serves it
  with `Cache-Control: public, max-age=0` and ETag revalidation. Use a short CDN
  TTL, or add a content hash/version, before applying long-lived caching; a stale
  geometry file must not be paired with a newer country list.
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
- Email delivery visible in the Brevo dashboard.
- Error tracking is optional and must be privacy-reviewed; if added, scrub
  cookies, auth headers, and request bodies.

No analytics by default, consistent with the privacy stance.

## 12. Costs (verify current pricing before committing)

| Service | Free tier likely covers | Paid trigger |
| --- | --- | --- |
| Vercel | Hobby for development/preview | Pro for commercial use / team features |
| Neon | Free tier for early usage | Storage/compute beyond free limits |
| Brevo | Free plan: 300 emails/day | Volume beyond free tier |
| Domain | — | Annual registration |

Prices and limits change; check each provider's current page rather than relying
on this table. The architecture deliberately avoids paid infrastructure beyond
these three.

## 13. Operational runbook (short)

- **Sign-ups failing:** check `DATABASE_URL`, Neon compute status, auth secret,
  and Vercel logs. Confirm migrations applied.
- **Emails not arriving:** check the Brevo dashboard for bounces, sender
  verification, domain authentication, and `EMAIL_FROM`. The action itself should
  have succeeded.
- **Invite link invalid:** check expiry/revocation/accepted state, and that the
  signed-in email matches the invitation.
- **Map blank:** check the dataset asset loaded (network tab), then the SVG
  `viewBox` and path data. A dataset integrity test should have caught this.
- **Suspected data leak:** rotate secrets, invalidate sessions, audit the
  authorization helper and its tests, notify affected users if needed.

## 14. What is deliberately not set up yet

- No CI pipeline (planned Phase 8). Phase 3 and Phase 4 checks were run locally.
- No custom domain.
- No error tracking.
- No staging environment separate from preview deployments.
- No load testing or autoscaling tuning.
