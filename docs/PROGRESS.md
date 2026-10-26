# AtlasShare — Progress

**Current phase:** Phase 2 — Accounts and authentication (**approved**).
**Status:** Phase 2 is complete and approved. Phase 3 has not started and awaits
an explicit go-ahead.
**Last updated:** 2026-10-26.

This is the first file to read when resuming work. It reflects what is actually
built, not what is planned. Plans live in `DEVELOPMENT_PLAN.md`.

## 1. Phase status

| Phase | Status | Notes |
| --- | --- | --- |
| 1. Foundation & planning | ✅ Complete (approved) | Runnable branded skeleton + full docs. Commit `ad7746c`. |
| 2. Accounts & authentication | ✅ Complete (approved 2026-10-26) | Auth, settings, reset, email plumbing, first migration. |
| 3. Country dataset & personal map | ⛔ Not started | D1 resolved; awaits Phase 3 go-ahead. |
| 4. Shared maps | ⛔ Not started | Schema exists; no UI or actions. |
| 5. Insights & filters | ⛔ Not started | D2 resolved: no notes/dates; filters/stats only. |
| 6. Image export | ⛔ Not started | — |
| 7. Public site & PWA | ⛔ Not started | — |
| 8. Hardening, QA & deployment | ⛔ Not started | — |

## 2. What exists today

### Accounts and authentication (Phase 2)

- Better Auth 1.7.12 with email/password, database sessions, and the Prisma
  adapter; handler at `/api/auth/[...all]`.
- Password policy: 12–128 characters, hashed by Better Auth (scrypt). Password
  reset links expire after one hour, are single-use, and revoke sessions.
- Sessions: 30-day lifetime, one-day rolling update, no cookie cache. Cookie
  observed locally as `HttpOnly`, `SameSite=Lax`, `Path=/`, 30-day `Max-Age`.
  `Secure` is applied by Better Auth in an HTTPS production origin; it could not
  be observed over local HTTP.
- Pages: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, and
  `/account` with name, password, and account-deletion forms.
- Password changes revoke every session (including the current one) and redirect
  to sign-in with a success notice. This avoids a session-rotation race in the
  client router.
- Account deletion is password-gated, enabled in Better Auth, and relies on
  Prisma cascades. The UI warns that owned shared maps are deleted.
- Welcome email is attempted once after sign-up and tracked with
  `welcomeEmailSentAt`; a missing `BREVO_API_KEY` makes it a logged no-op, and
  send failures never block sign-up.
- Rate limits are enabled only in production (Better Auth, per-instance memory):
  sign-in 10/15 min, sign-up 5/hour, reset request 3/hour, reset submit 10/15 min.
- Server-side authorization gate `requireSession()`; the proxy only redirects
  `/account` when no session cookie is present. Fake/expired cookies still hit
  the server check.
- CSRF origin checks are enabled by Better Auth; cross-origin auth POSTs return
  403. Sign-in failures are generic and identical for unknown emails.
- Local development uses Homebrew PostgreSQL 18 (`atlasshare_dev`,
  `atlasshare_test`). The runtime adapter is Neon for `*.neon.tech` hosts and
  `@prisma/adapter-pg` otherwise.

### Foundation

- Next.js 16.4.3 App Router, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3,
  Turbopack.
- Brand identity in `src/config/brand.ts`; design tokens in `src/app/globals.css`.
- Root metadata, branded home page (still a Phase 1/2 placeholder, not the final
  landing page), branded 404, and an SVG app icon.
- Accessible focus styles, reduced-motion handling, responsive layout verified
  at 320/390/1280 px.

### Tooling

- ESLint 9, TypeScript strict, Vitest 5 + RTL + jsdom + jest-dom.
- Scripts: `dev`, `build`, `start`, `lint`, `typegen`, `typecheck`, `test`,
  `test:watch`, `check`, `postinstall`, `db:generate`, `db:migrate`,
  `db:deploy`, `db:studio`, `db:auth-schema`.
- Prisma 7 schema in `prisma/schema.prisma`; migrations committed. Better Auth
  schema was generated with the installed CLI and then extended.
- `.env` is gitignored; `.env.example` documents all variables. No credentials
  are committed.

### Documentation

`README.md`, `docs/PROJECT_SPECIFICATION.md`, `ARCHITECTURE.md`, `DATABASE.md`,
`SECURITY.md`, `DEVELOPMENT_PLAN.md`, `DECISIONS.md`, `TESTING.md`,
`DEPLOYMENT.md`, `CHANGELOG.md`, this file.

### Not built (do not assume otherwise)

No country dataset or map, no visit toggling, no shared-map UI/actions, no
insights, no export, no final landing page, no PWA, no CI, no deployment. The
shared-map tables exist only as schema for Phase 4.

## 3. Verification (2026-10-25, provider/tests re-run 2026-10-26)

Environment: macOS, Node v24.13.1, npm 11.8.0, local PostgreSQL 18, headless
Chrome, production build served on port 3102. The manual browser/API checks were
not repeated after the Brevo provider change; lint, types, unit tests, and builds
were re-run.

| Check | Command / method | Result |
| --- | --- | --- |
| Lint | `npm run lint` | ✅ exit 0 |
| Types | `npm run typecheck` | ✅ exit 0 |
| Unit/component tests | `npm test` | ✅ 46/46 passed (8 files) |
| Production build | `npm run build` | ✅ exit 0; `/`, `/sign-in`, `/sign-up`, `/forgot-password` static; `/account`, `/reset-password`, auth API dynamic. Re-run with `.env` removed: ✅ passes without runtime secrets. |
| Migration from empty DB | `prisma migrate deploy` against fresh `atlasshare_test` | ✅ 1 migration; 9 tables incl. `_prisma_migrations` |
| Sign-up | production server + browser | ✅ account + session created; lands on `/account`; 30-day HttpOnly/SameSite=Lax cookie |
| Duplicate sign-up | API | ✅ 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` |
| Wrong/unknown sign-in | API | ✅ identical 401 `Invalid email or password` |
| Sign-out / sign-in | browser | ✅ session ends and a new session signs in |
| Name update | browser + server action | ✅ trimmed, revalidated, shown immediately |
| Password change | browser + server action | ✅ redirects to `/sign-in?passwordChanged=1`, all sessions revoked, new password works |
| Password reset | API + browser | ✅ generic request response; token single-use; 1-hour expiry; new password signs in |
| Account deletion | browser | ✅ redirects to `/?account=deleted`; user, sessions, visits, map, member, invitation rows all cascaded to 0 |
| Authorization | fake cookie + no cookie | ✅ `/account` returns 307 to `/sign-in`; proxy alone is not trusted |
| CSRF | cross-origin POST | ✅ 403 `INVALID_ORIGIN` |
| Password minimum | API | ✅ 400 `PASSWORD_TOO_SHORT` |
| Server-action gate | Vitest | ✅ unauthenticated name/password/delete actions redirect and never call Better Auth |
| Validation | Vitest | ✅ name trim/length, password length/match, DELETE confirmation |
| Layout | Chrome CDP at 320/390/1280 | ✅ no horizontal overflow; labeled inputs; correct colors and single `h1` |
| Console/network | Chrome CDP | ✅ no app errors after adding the app icon; only expected 404 for the deliberately tested missing page |
| Welcome email delivery | Brevo | ✅ app sign-up returned 200; Brevo accepted it; test 2 delivered/opened; test 3 delivered/opened in Gmail Promotions |
| Neon | remote DB | ✅ dev branch connected; migration applied; schema up to date |
| Real email-client rendering | manual | ⬜ test 3 opened in Promotions; visual layout not reviewed |
| Rate-limit exhaustion | manual | ⬜ not run — would deliberately lock the test IP for 15 minutes |
| Cross-browser / axe / VoiceOver | manual | ⬜ not run |
| Automated DB/integration tests | `TEST_DATABASE_URL` | ⬜ not automated; DB behavior was verified manually (see `TESTING.md`) |

### Defects found and fixed during verification

- **Password-change redirect loop.** Better Auth rotates the session on password
  change. The proxy redirected signed-in users away from auth pages based on
  cookie presence, which could bounce `/account` ↔ `/sign-in` and blank the
  client. Fixed by removing the auth-page redirect from the proxy and making a
  password change sign out everywhere before redirecting to sign-in.
- **Account deletion returned 404.** Better Auth disables `/delete-user` unless
  `user.deleteUser.enabled` is true. Enabled it and re-verified deletion and
  cascades.
- **Stale name field after revalidation.** The uncontrolled input kept its
  previous value after a server update. Added a `key={name}` remount.
- **Missing favicon.** Browser requested `/favicon.ico` and logged a 404. Added
  `src/app/icon.svg`.
- **Hero heading had no text separation** in the accessibility tree. Added a
  space between "Your world," and "mapped together."
- **Build tried to prerender `/account` without secrets.** With `.env` removed,
  `next build` failed during static generation of the authenticated layout. The
  layout now opts into `dynamic = "force-dynamic"`; a secret-free build passes.

## 4. Decisions made in Phase 2

Full records in `DECISIONS.md` (ADR-017 onwards).

- Local PostgreSQL 18 for development/testing; Neon remains the production
  target. Runtime adapter is selected from the database host.
- Lazy environment validation and lazy auth/database singletons so `next build`
  needs no secrets.
- Email/password minimum 12, maximum 128; no email-verification enforcement yet.
- 30-day database sessions, 1-day rolling refresh, no session cookie cache.
- Production-only, in-memory rate limits; accepted as a speed bump on serverless.
- Welcome email best-effort with a once-only claim; missing Brevo config is a
  logged skip.
- Password change signs out every device and requires signing in again.
- Account deletion is immediate after password confirmation and relies on
  cascades.
- Proxy only protects `/account`; auth pages are not redirected by cookie
  presence (avoids rotation races and lets a signed-in user reach sign-in).
- Better Auth password-reset tokens are stored raw in `verification.identifier`
  by the library. Accepted for now (single-use, ≤1 hour) and recorded as a
  limitation; invitation tokens remain hashed by design.

## 5. Resolved decisions

### D1 — Country set (resolved 2026-10-26)

- Use **250 countries & territories**: 249 ISO 3166-1 entries + Kosovo,
  labelled consistently, with territories counted separately.
- Palestine (`PS`) and Israel (`IL`) are both standalone map units and must never
  be merged. The dataset generator must explicitly verify both paths and labels.
- This is a comprehensive dataset, not a political endorsement. Changing the set
  later needs a data migration and copy changes.

### D2 — Notes/dates (resolved 2026-10-26)

- The initial product stores **visited/unvisited state only**.
- Do not build per-country notes, first-visited dates, or visit-history UI.
  Repeat visits would need a separate history model if ever added.
- The optional `note` and `firstVisitedAt` columns stay reserved but unused; they
  are not exposed through the app.

## 6. Blockers and external dependencies

| Item | Status | Needed for |
| --- | --- | --- |
| Phase 3 go-ahead | not given | Starting the country map |
| Neon dev branch + connection strings | connected; migration applied | Production deployment verification |
| Brevo account + verified sender | configured; test delivered/opened | Reset-email validation |
| Brevo production domain authentication | optional; not configured | Better deliverability in Phase 8 |
| Approval to push to `origin` | not given | Sharing the repository |
| Domain name (optional) | undecided | Phase 8 |

No credentials are committed. `.env.example` documents the expected variables.

## 7. Repository state

- Local git repository on `main`. Phase 1 is commit `ad7746c`; Phase 2 is
  committed locally and is **not pushed**.
- Remote `origin` = `https://github.com/katerikoti/AtlasShare.git`. **Not
  pushed** — pushing needs explicit approval.
- `gh` CLI is not installed; git credentials are cached.
- `package-lock.json` is committed; `node_modules`, `.next`, `.env*`,
  `src/generated`, and `tsbuildinfo` are ignored.

## 8. Next steps

1. Confirm visual rendering of the delivered email and exercise password-reset
   delivery through the app.
2. Obtain explicit approval to start Phase 3; push only with explicit permission.
3. Build the Phase 3 country dataset (250 units, `PS` and `IL` separate),
   personal map, and visited toggle.
4. Add automated DB integration tests against `TEST_DATABASE_URL` (toggle,
   isolation, cascades).
5. Stop for approval before Phase 4.

## 9. Known limitations and debt

- **Email delivery is now verified through Brevo.** An app sign-up was accepted,
  and a follow-up test message was delivered and opened in the real inbox. Visual
  rendering still needs a human check, and the reset email has not been exercised
  through the app yet. The welcome message is not retried for users who signed up
  while email was disabled.
- **The `note` and `firstVisitedAt` columns are unused** by the approved initial
  scope (D2). They remain in the schema as reserved fields; remove them with a
  migration before launch if notes/dates are still unwanted.
- **Brevo IP allowlisting is a deployment concern.** Local calls required
  authorizing the current egress IP. Vercel's outbound IPs are dynamic, so
  production will need IP blocking disabled, static egress, or a scoped M2M token
  (which would replace the current `api-key` header).
- **Brevo adds a `List-Unsubscribe` header to transactional mail.** Gmail may
  show an unsubscribe control and place unauthenticated mail in Promotions; the
  free plan cannot remove the header. Clicking it can suppress future
  transactional email. Domain authentication is the main deliverability fix.
- **Password-reset tokens are stored raw** by Better Auth in
  `verification.identifier` (the identifier includes the token). They are
  single-use and expire in one hour. Replacing this needs a custom reset flow.
- **Rate limiting is per-instance memory** and only active in production. It
  slows basic brute force but is not a shared limiter.
- **No automated DB integration tests** are in `npm test`; the migration and
  cascade behavior were verified manually against local Postgres. The test
  database exists but is not wired into Vitest.
- **No email verification, MFA, or OAuth.** Email verification enforcement is
  deferred; sign-up reports that an address already exists.
- **Secure cookies are not observable locally** because the smoke test used
  HTTP. Production uses an HTTPS origin.
- **No CI, deployment, or error monitoring.** Checks run locally.
- **npm audit** reports 8 advisories (1 critical) through development tooling:
  `@better-auth/cli` carries its own older Better Auth, drizzle-orm, and lodash;
  Prisma Studio pulls lodash. The runtime uses Better Auth 1.7.12, which is
  outside the affected range, and none of these are in the production bundle.
  Re-check before deployment and replace/upgrade when fixes are available.
- **Visual review is delegated to the user.** Layout is checked by DOM
  measurements, not by the agent viewing screenshots.
- The home page is still a temporary Phase 1/2 placeholder; the real landing
  page is Phase 7.

## 10. Resuming in a fresh session

1. Read this file, then `DEVELOPMENT_PLAN.md`, then `AGENTS.md`.
2. `npm ci` (or `npm install` if the lockfile changed) and `npm run check`.
3. Start local Postgres if needed and confirm `DATABASE_URL` / `DIRECT_URL`.
4. Check the "Open decisions" and "Blockers" sections above.
5. Do not start a later phase without explicit approval.
6. At the end of any work: update this file, run `npm run check` and
   `npm run build`, report honestly, and stop.
