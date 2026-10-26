# Changelog

Notable changes, newest first. This project follows a phase-based plan; see
`DEVELOPMENT_PLAN.md`. Version numbers are not yet meaningful for the product
(no release), but the package version is tracked.

## [Unreleased]

### Added — Phase 2: Accounts and authentication (2026-10-25, updated 2026-10-26)

- PostgreSQL schema and first migration:
  `20261025141145_init_auth_and_accounts`. Better Auth tables plus
  `visited_countries`, `shared_maps`, `shared_map_members`,
  `shared_map_invitations`, and the `SharedMapRole` enum.
- Prisma 7 client with a host-selected driver adapter: Neon for `*.neon.tech`,
  `@prisma/adapter-pg` for local Postgres. Lazy database and auth singletons.
- Lazy Zod environment validation in `src/config/env.ts` with readable failures.
- Better Auth 1.7.12 email/password auth: `/api/auth/[...all]`, browser client,
  database sessions, 12–128 character passwords, one-hour single-use reset
  tokens, and session revocation on reset.
- Auth UI: sign up, sign in, sign out, forgot password, reset password.
- Account settings at `/account`: update display name, change password, delete
  account; `requireSession()` authorization gate.
- Welcome and password-reset HTML emails, a best-effort Brevo mailer, and a
  no-op mailer when `BREVO_API_KEY` is absent. Welcome email is sent at most
  once via `welcomeEmailSentAt`.
- Production-only Better Auth rate limits: sign-in 10/15 min, sign-up 5/hour,
  reset request 3/hour, reset submit 10/15 min.
- Route groups `(auth)` and `(app)`, a signed-in shell, an app icon, and a proxy
  that redirects `/account` when no session cookie is present.
- Prisma scripts: `db:generate`, `db:migrate`, `db:deploy`, `db:studio`,
  `db:auth-schema`; `postinstall` regenerates the client.
- Tests for env validation, account validation, the session gate, all three
  account actions rejecting unauthenticated callers, and the existing brand and
  email suites. Total: 46 tests in 8 files. The Brevo provider switch added six
  mailer tests (request shape, sender parsing, provider errors, empty responses).

### Changed

- The home page now links to sign-in/sign-up and reports Phase 2 status.
- Password changes sign out every session and redirect to sign-in with a notice.
- Account deletion is enabled, password-gated, and relies on Prisma cascades.
- Transactional email switched from Resend to Brevo's HTTP API so a verified
  individual sender works without buying a domain. `RESEND_API_KEY` became
  `BREVO_API_KEY`; the Resend dependency was removed. Domain authentication is
  still recommended for production deliverability.

### Fixed

- Removed a password-change redirect loop caused by a session-cookie rotation
  racing the proxy's auth-page redirect.
- Enabled Better Auth account deletion (it returned 404 while disabled).
- The name field remounts after a server update so it never shows a stale value.
- Added `src/app/icon.svg` to stop the browser's favicon 404.
- Added text separation in the hero heading for assistive technology.
- Forced the authenticated `(app)` layout to dynamic rendering. Without this, a
  production build with no `.env` tried to prerender `/account` and failed env
  validation; a secret-free build now passes.

### Changed — decisions and phase approval (2026-10-26)

- Phase 2 approved by the product owner.
- D1 resolved: 250 countries & territories, with Palestine (`PS`) and Israel
  (`IL`) as separate map units.
- D2 resolved: visited/unvisited state only; no per-country notes or visit dates
  in the initial scope. The reserved schema columns stay unused.

### Security

- Sign-in errors are identical for unknown emails and wrong passwords.
- Cross-origin auth POSTs are rejected (verified 403).
- Fake or missing session cookies on `/account` redirect to sign-in.
- Account deletion and all declared cascades verified against local Postgres.
- Known deviation recorded: Better Auth stores password-reset tokens raw in
  `verification.identifier`; single-use and one-hour lifetime bound the risk.

### Verified

- `npm run lint`, `npm run typecheck`, `npm test` (46/46), and `npm run build`
  pass.
- `prisma migrate deploy` applied the migration cleanly to a recreated
  `atlasshare_test` database and to the connected Neon `dev` branch; `migrate
  status` reports the schema is up to date.
- Brevo accepted a direct test email and the welcome email sent by an app
  sign-up; `welcomeEmailSentAt` was set and the test account was removed. Test 2
  was delivered and opened; test 3 was delivered and opened from Gmail
  Promotions. The body has no unsubscribe link, but Brevo adds a
  `List-Unsubscribe` header. Visual rendering and password-reset delivery were
  not confirmed.
- Manual production-mode flows passed: sign-up, sign-in/out, name update,
  password change, reset, deletion, cascades, CSRF, short-password rejection,
  and 320/390/1280 px layout checks.
- Neon is connected and migrated; Brevo test delivery is confirmed. Visual email
  rendering and password-reset delivery remain unconfirmed. Rate-limit
  exhaustion, axe, VoiceOver, and cross-browser checks were not run.

### Not included

- Country dataset, map, visit toggling, shared-map UI/actions, insights, image
  export, final landing page, PWA, CI, deployment. Shared-map tables are schema
  only for Phase 4.

### Added — Phase 1: Foundation and planning (2026-10-25)

- Next.js 16.4.3 App Router project with React 19.3.0, TypeScript 5.9.3, and
  Tailwind CSS 4.3.3 (Turbopack).
- Brand identity module (`src/config/brand.ts`) and CSS design tokens for the
  warm paper/moss/dusty-rose palette.
- Root layout with metadata, Open Graph/Twitter defaults, theme color, and
  viewport settings.
- Temporary branded placeholder page at `/` (explicitly not the landing page)
  and a branded 404 page.
- Accessible focus styles, selection styling, and `prefers-reduced-motion`
  handling.
- Unit test setup: Vitest 5, React Testing Library, jsdom, jest-dom.
- Brand tests: centralized product name and WCAG contrast checks for text and
  map borders.
- Tooling scripts: `lint`, `typegen`, `typecheck`, `test`, `test:watch`,
  `check`.
- Project configuration: `.nvmrc` (Node 24), `.env.example`, `.gitignore`
  protecting secrets, `AGENTS.md` project rules.
- Documentation set: README, product specification, architecture, database,
  security, development plan, decision log, testing, deployment, progress, and
  this changelog.
- Local git repository initialized with remote `origin`; initial commit.

### Verified

- `npm run lint`, `npm run typecheck`, `npm test` (4/4), and `npm run build`
  pass.
- Production smoke test: HTTP 200, correct title and heading, no horizontal
  overflow at 320/390/1280 px, correct computed colors and fonts, no console
  entries or failed requests.
- 404 route returns HTTP 404 with the branded page.

### Not included

- Authentication, database schema/migrations, country dataset, map, shared
  maps, export, landing page, PWA, CI, deployment. These are later phases.

## Format

- **Added** for new features.
- **Changed** for behavior changes.
- **Fixed** for bug fixes.
- **Security** for vulnerabilities and hardening.
- **Removed** for removals.
- **Verified** for check results worth recording.
