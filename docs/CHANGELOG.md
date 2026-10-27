# Changelog

Notable changes, newest first. This project follows a phase-based plan; see
`DEVELOPMENT_PLAN.md`. Version numbers are not yet meaningful for the product
(no release), but the package version is tracked.

## [Unreleased]

### Added — Phase 4: shared maps (2026-10-26)

- `/shared` map list and create form; `/shared/[mapId]` combined read-only map,
  member filter, member list, owner settings, and management sections.
- Public `/invite/[token]` preview/acceptance page that prompts signed-out
  visitors to sign in or create an account, then returns them to the invitation.
- Shared-map data layer and Server Actions: create, update, delete, invite,
  revoke, accept, remove member, and leave. The owner membership is created with
  the map in one transaction; acceptance claims the invitation atomically.
- 256-bit single-use invitation tokens, stored only as SHA-256 hashes, with a
  7-day expiry and revoke-on-replace. Email delivery is best-effort through
  Brevo; the owner can copy the link.
- Combined view built from authorization-scoped queries: display names,
  membership ids, deduplicated country sets, combined counts, and per-member
  filtering. No emails, user ids, raw visit rows, notes, or dates are sent.
- Invitation email template and `safeNextPath` validation for sign-in/sign-up
  return URLs.
- Invite-route response headers: `Referrer-Policy: no-referrer`,
  `X-Robots-Tag: noindex, nofollow`, and `Cache-Control: private, no-store`.

### Changed — Phase 4

- User-facing copy now describes the product only; internal phase numbers and
  future-feature timing were removed from the landing page, app footer, account
  page, and source comment.
- The landing header scales the wordmark and hides the duplicate sign-in link
  below `sm`, fixing a clipped “Create account” button at 320 px.
- Removing a member now revalidates `/shared` as well as the map detail, so the
  list's member and combined counts are not stale.
- Invitation copy feedback uses one live region and resets on a new submission;
  single-member labels use correct pluralization.
- The proxy optimistically protects `/shared` in addition to `/account`; all
  pages and actions still re-check authorization server-side.

### Verified — Phase 4

- `npm run check` passed: lint, typecheck, and **105/105 tests in 17 files**
  (including 14 local PostgreSQL integration tests).
- `npm run build` passed with `/shared`, `/shared/[mapId]`, and
  `/invite/[token]` dynamic. **No new migration was required**; the Phase 2
  shared-map tables are reused.
- Two-account production browser QA passed for create/invite/wrong-email/accept,
  combined counts (3) and filtering (owner 2), used/revoked links, member leave,
  owner rename/revoke/remove, deletion, and deleted-map HTTP 404.
- Read-only shared view: 250 SVG paths, zero checkboxes, member controls absent.
- Expired invitation browser check on 2026-10-27: owner saw no pending invitation
  after expiry, and the signed-in invited account saw the generic unavailable
  state; no phase or roadmap wording was present in rendered UI.
- Lighthouse on the public landing and invitation pages scored 100 for
  accessibility, best practices, and SEO with no reported failures; authenticated
  shared-map pages were not Lighthouse-audited.
- Responsive metrics at 320/390 px for the landing page, `/shared`,
  `/shared/[mapId]`, and `/map`; document width matched the viewport. Invite
  response headers checked with `curl`.
- Manual gaps: physical touch, Safari/Firefox, keyboard/screen-reader, visual
  design approval, and invitation inbox rendering.
- Accepted limitations: no invitation rate limit, no email verification before
  acceptance, no retry/purge job, and raw token paths can appear in hosting
  access logs. See `PROGRESS.md`/`SECURITY.md`.

### Added — Phase 3: country dataset and personal map (2026-10-26)

- Reproducible 250-unit dataset generator from exact
  `@svg-maps/world@2.0.0` (CC-BY-4.0), plus a committed Natural Earth 1:10m
  Antarctica outline (public domain). Removes `go`/`ju`, merges six `um-*`
  subdivisions into `UM`, adds `AQ`, normalizes names, sorts codes, and asserts
  separate `PS`/`IL`.
- Generated `src/data/countries.generated.ts`, a canonical
  `src/data/countries.ts` helper, and `public/map/countries.json` (250 SVG paths,
  viewBox `0 0 1010 760`). `npm run data:countries` is deterministic.
- Signed-in `/map` route with an SVG map, searchable 250-row country list,
  visited count and progress bar, legend, empty state, geometry loading/error
  with retry, route error boundary, and CC-BY/Natural Earth attribution.
- `setVisitedCountryAction` and user-scoped persistence in
  `src/server/actions/visits.ts` / `src/server/visits.ts`; optimistic mark/unmark
  with rollback on failure.
- Mobile-first map-first layout with no pan/zoom dependency; the country list
  follows the map on narrow screens, and map and list are side by side from
  `lg`.
- Local DB integration tests for idempotent set/remove and two-user isolation;
  dataset, action authorization/validation, and map component tests.
- `data:countries` script and exact `@svg-maps/world` dependency pin.
- Home page and README now report Phase 3.

### Changed — Phase 3

- Client auth forms submit with `method="post"` (sign-in, sign-up,
  forgot-password, reset-password), so a failed JavaScript boot cannot put a
  password in the URL.
- Narrow-screen map/list grid now uses `grid-cols-1` and `min-w-0`, fixing a
  463 px document width at a 320 px viewport.
- Map attribution includes a CC BY 4.0 licence link and explains the curated
  dataset. The public map asset is served with ETag revalidation and compressed
  by the framework; no private visit data is included.

### Verified — Phase 3

- `npm run check` passed: lint, typecheck, and **64/64 tests in 12 files**
  (including three local PostgreSQL integration tests).
- `npm run build` passed; `/map` is dynamic and `/map/countries.json` is public
  static data. No new migration is required.
- Browser QA with a signed-in production session: 250 SVG paths, 250 list rows,
  search (`japan` → 1 of 250), mark/unmark count updates, persistence across
  reload, and user isolation (integration test).
- Layout measured at 320, 390, 1200, and 1280 px: no horizontal overflow; map
  first below `lg`; map/list side by side above it.
- Dataset generation repeated with identical output; 250 unique units, unique
  names, complete paths, separate `PS`/`IL`.
- Manual gaps: physical phone/touch, Safari/Firefox, keyboard/screen-reader,
  geometry error/offline, throttled performance, and visual design approval.


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

- The home page now links to sign-in/sign-up and reports Phase 3 status.
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
