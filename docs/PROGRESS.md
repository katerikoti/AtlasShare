# AtlasShare — Progress

**Current phase:** Phase 3 — Country dataset and personal map (implementation
complete, **awaiting approval**).
**Status:** Phase 3 is built, verified, and documented. It is not approved yet;
Phase 4 has not started.
**Last updated:** 2026-10-26.

This is the first file to read when resuming work. It reflects what is actually
built, not what is planned. Plans live in `DEVELOPMENT_PLAN.md`.

## 1. Phase status

| Phase | Status | Notes |
| --- | --- | --- |
| 1. Foundation & planning | ✅ Complete (approved) | Runnable branded skeleton + full docs. Commit `ad7746c`. |
| 2. Accounts & authentication | ✅ Complete (approved 2026-10-26) | Auth, settings, reset, email plumbing, first migration. |
| 3. Country dataset & personal map | ✅ Complete (implementation; approval pending) | 250-unit dataset, private map, visited toggle, integration tests, browser QA. |
| 4. Shared maps | ⛔ Not started — gated | Schema exists; no UI or actions. Needs Phase 3 approval. |
| 5. Insights & filters | ⛔ Not started | D2 resolved: no notes/dates; filters/stats only. |
| 6. Image export | ⛔ Not started | — |
| 7. Public site & PWA | ⛔ Not started | — |
| 8. Hardening, QA & deployment | ⛔ Not started | — |

## 2. What exists today

### Country dataset and personal map (Phase 3)

- Canonical dataset: 250 units (249 ISO 3166-1 entries plus Kosovo `XK`),
  generated from `@svg-maps/world@2.0.0` (CC-BY-4.0) plus a committed Natural
  Earth 1:10m Antarctica outline (public domain). Palestine (`PS`) and Israel
  (`IL`) are separate units. Generated metadata is in
  `src/data/countries.generated.ts`; geometry is in `public/map/countries.json`.
- `scripts/generate-countries.mjs` removes `go`/`ju`, merges six `um-*`
  subdivisions into `UM`, adds `AQ`, normalizes names, sorts codes, asserts the
  count, creates output directories, and requires exactly `@svg-maps/world`
  `2.0.0`. `npm run data:countries` reproduces both outputs deterministically.
- `/map` is a signed-in, user-scoped page: a 250-path SVG map, searchable
  250-row country list, count and progress bar, legend, empty state, geometry
  loading/error/retry, route error boundary, and source/licence disclosure.
- Map geometry is fetched after first paint from `/map/countries.json`, validated
  against all 250 codes, and is not bundled into JavaScript. Raw asset size is
  ~1.2 MB; local production compression measured ~398 KB. It is public data.
- Visits are stored in `visited_countries` with a unique `(userId, countryCode)`
  constraint. `setVisitedCountryAction` rejects unauthenticated callers and
  codes outside the dataset; reads/writes are scoped to the session user.
- The client updates optimistically and rolls back with an error message when
  the Server Action fails. Counts are server-rendered initially.
- Narrow screens use a **list-first fallback** (list ordered before the map) and
  no pan/zoom dependency. From `lg` upward the map and list are side by side.
  At 320/390 px there is no horizontal overflow; this was fixed after finding an
  intrinsic grid width of 463 px (`grid-cols-1` + `min-w-0`).
- Four client auth forms now use `method="post"` so a failed JavaScript boot
  cannot put a password into the URL.
- Home page and README now report Phase 3; the landing page itself is still the
  temporary development placeholder until Phase 7.

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
- Root metadata, branded home page (still a temporary placeholder, not the final
  Phase 7 landing page), branded 404, and an SVG app icon.
- Accessible focus styles, reduced-motion handling, responsive layout verified
  at 320/390/1280 px; map no longer causes horizontal overflow at 320 px.

### Tooling

- ESLint 9, TypeScript strict, Vitest 5 + RTL + jsdom + jest-dom.
- Scripts: `dev`, `build`, `start`, `lint`, `typegen`, `typecheck`, `test`,
  `test:watch`, `check`, `postinstall`, `data:countries`, `db:generate`,
  `db:migrate`, `db:deploy`, `db:studio`, `db:auth-schema`.
- Prisma 7 schema in `prisma/schema.prisma`; migrations committed. Better Auth
  schema was generated with the installed CLI and then extended.
- `.env` is gitignored; `.env.example` documents all variables. No credentials
  are committed.

### Documentation

`README.md`, `docs/PROJECT_SPECIFICATION.md`, `ARCHITECTURE.md`, `DATABASE.md`,
`SECURITY.md`, `DEVELOPMENT_PLAN.md`, `DECISIONS.md`, `TESTING.md`,
`DEPLOYMENT.md`, `CHANGELOG.md`, this file.

### Not built (do not assume otherwise)

No shared-map UI or actions, no insights/filters, no image export, no final
landing page, no PWA, no CI, and no deployment. The shared-map tables exist only
as schema for Phase 4. Visited state has no notes or dates (D2).

## 3. Verification (2026-10-26)

Environment: macOS, Node v24.13.1, npm 11.8.0, local PostgreSQL 18, Chrome 148
(headless CDP and the app's browser pane), production build served on
`127.0.0.1:3003` with matching `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`.

| Check | Command / method | Result |
| --- | --- | --- |
| Lint | `npm run lint` | ✅ exit 0 |
| Types | `npm run typecheck` | ✅ exit 0 |
| Tests | `npm test` | ✅ 64/64 passed (12 files); 3 local DB integration tests |
| Full check | `npm run check` | ✅ exit 0 (2026-10-26) |
| Production build | `npm run build` | ✅ exit 0; `/map` dynamic; geometry is a static public asset |
| Dataset count | generator + tests | ✅ 250 units, 250 paths, unique codes and names |
| Palestine/Israel | generator + test | ✅ separate `PS` and `IL` paths |
| Determinism | run generator twice | ✅ identical output |
| Map render | production + signed-in browser | ✅ 250 paths, 250 list rows, count/progress |
| Search | browser | ✅ `japan` shows 1 of 250 |
| Toggle | browser + DB | ✅ mark/unmark updates count and `visited_countries` |
| Refresh persistence | browser | ✅ visit survives reload; count still correct |
| User isolation | integration test | ✅ two users' visits remain separate |
| Unauthenticated access | `curl` without cookie | ✅ `/map` and `/account` return 307 to `/sign-in` |
| Desktop layout | Chrome 1200 px | ✅ map and list side by side; no horizontal overflow |
| Mobile layout | Chrome 320/390 px | ✅ list first, map follows; no horizontal overflow after `grid-cols-1`/`min-w-0` fix |
| Auth after form change | production browser | ✅ sign-in works with `method="post"`; sign-up not repeated |
| Phase 2 auth/email | prior verification | ✅ see `docs/TESTING.md` §6; not all checks repeated |
| Migration | schema review | ✅ no schema change or new migration in Phase 3; Phase 2 migration remains the source |
| Geometry error/offline | manual | ⬜ not browser-tested |
| Keyboard/screen reader | manual | ⬜ not run |
| Physical phone/Safari/Firefox | manual | ⬜ not run |
| Visual review | screenshots | ⬜ delegated to the owner |

### Defects found and fixed during verification

- **Narrow-screen horizontal overflow.** The map/list grid used auto columns;
  intrinsic content forced both cards to 439 px and the document to 463 px at a
  320 px viewport. Added `grid-cols-1` and `min-w-0` to the grid and cards. At
  320/390 px the page now equals the viewport width and the list stays first.
- **Password leakage without JavaScript.** Client auth forms could fall back to
  a GET submission and put the password in the query string. Added
  `method="post"` to sign-in, sign-up, forgot-password, and reset-password
  forms.
- **Hidden automation tab looked stuck on the map skeleton.** A hidden browser
  tab pauses `requestAnimationFrame`, so React's streamed Suspense segment is not
  revealed by the browser pane/CDP tab. In a visible Chrome tab the map reveals
  normally; do not “fix” this by removing streaming based only on a hidden tab.
- **A stale lockfile install changed 74 unrelated optional dependencies.**
  Restored the lockfile and manually added only the exact `@svg-maps/world`
  entry. Validate with `npm ci --dry-run` before relying on a clean install.

### Phase 2 defects found and fixed (historical)

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

## 4. Decisions carried from Phase 2

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

### Phase 3 decisions

Full records in ADR-024, ADR-025, and §5.

- Use the curated `@svg-maps/world@2.0.0` dataset plus a custom Natural Earth
  1:10m Antarctica outline; keep the generator database-free and deterministic.
- Keep visited state only (ADR-024): no notes, dates, or history UI.
- Fetch public geometry at runtime instead of bundling it; validate all 250 codes
  before rendering; never put visit data in the asset.
- On narrow screens, order the country list before the map (no pan/zoom
  requirement) and keep the list keyboard-accessible.
- No new database migration; `visited_countries` from Phase 2 is sufficient.
- Auth forms submit with `method="post"`; this is a hardening fix, not a new auth
  flow.

## 5. Resolved decisions

### D1 — Country set (resolved 2026-10-26)

- Use **250 countries & territories**: 249 ISO 3166-1 entries + Kosovo,
  labelled consistently, with territories counted separately.
- Palestine (`PS`) and Israel (`IL`) are both standalone map units and must never
  be merged. The dataset generator must explicitly verify both paths and labels.
- Implemented source: `@svg-maps/world@2.0.0` (CC-BY-4.0), removing `go`/`ju`,
  merging six `um-*` paths into `UM`, and adding `AQ` from a committed Natural
  Earth 1:10m outline (public domain). The generator asserts separate `PS` and
  `IL` paths and a total of 250.
- This is a comprehensive dataset, not a political endorsement. Changing the set
  later needs a data migration, orphan-row review, and copy changes.

### D2 — Notes/dates (resolved 2026-10-26)

- The initial product stores **visited/unvisited state only**.
- Do not build per-country notes, first-visited dates, or visit-history UI.
  Repeat visits would need a separate history model if ever added.
- The optional `note` and `firstVisitedAt` columns stay reserved but unused; they
  are not exposed through the app.

## 6. Blockers and external dependencies

| Item | Status | Needed for |
| --- | --- | --- |
| Phase 3 owner approval | pending | Starting Phase 4 |
| Neon dev branch + connection strings | connected; Phase 2 migration applied | Deployment verification |
| Brevo account + verified sender | configured; test delivered/opened | Reset-email validation |
| Brevo production domain authentication | optional; not configured | Better deliverability in Phase 8 |
| Approval to push to `origin` | not given | Sharing the repository |
| Domain name (optional) | undecided | Phase 8 |

No technical blocker remains in Phase 3. No credentials are committed;
`.env.example` documents the expected variables.

## 7. Repository state

- Local git repository on `main`. Phase 1 is `ad7746c`; Phase 2 is `3065b2f`;
  the Phase 2 documentation commit is `6ae3b7c`.
- Phase 3 changes are committed locally in the final Phase 3 commit; run
  `git log -1 --oneline` for the exact hash. **Not pushed** — pushing needs
  explicit approval.
- Remote `origin` = `https://github.com/katerikoti/AtlasShare.git`.
- `gh` CLI is not installed; git credentials are cached.
- `package-lock.json` is committed; `node_modules`, `.next`, `.env*`,
  `src/generated`, and `tsbuildinfo` are ignored.
- The Phase 3 smoke account was deleted after browser QA; the local integration
  database contains no persistent fixtures.

## 8. Next steps

1. Obtain explicit Phase 3 approval. Do not start Phase 4 before it.
2. Push only with explicit permission.
3. Before Phase 4, decide whether to keep the reserved `note` /
   `firstVisitedAt` columns for future use or remove them in a migration.
4. In Phase 4, add shared-map membership, invitations, and authorization tests;
   the schema already exists.
5. Optionally complete the outstanding manual checks: physical phone, keyboard
   and screen reader, geometry error/offline, and visual approval.
6. Keep the welcome/reset email visual and delivery check on the Phase 8 list.

## 9. Known limitations and debt

- **Map visual review is delegated.** Layout was checked with Chrome metrics at
  320/390/1200/1280 px and screenshots were captured, but the agent did not
  visually approve the rendered map. Physical-phone touch, Safari/Firefox,
  keyboard-only navigation, screen-reader output, geometry error/retry, offline,
  and throttled-mobile performance remain unverified.
- **Geometry is a public 1.2 MB asset.** Local production compresses it to
  ~398 KB; it is ETag-revalidated (`max-age=0`) at an unversioned path. A CDN
  should use a short TTL or a versioned URL if long caching is desired. It never
  contains visit data.
- **Antarctica uses an approximate projection** from Natural Earth 1:10m; the
  left edge is slightly clipped by the `0 0 1010 760` viewBox. It is a visual
  outline, not a survey boundary.
- **No pan/zoom.** Narrow screens deliberately use the list-first fallback; the
  map is a visual shortcut, not the only input.
- **Email delivery is verified through Brevo**, but visual rendering and the
  password-reset message through the app still need a human check. The welcome
  message is not retried for users who signed up while email was disabled.
- **The `note` and `firstVisitedAt` columns are unused** by the approved initial
  scope (D2). They remain reserved; remove them with a migration before launch if
  notes/dates are still unwanted.
- **Brevo IP allowlisting is a deployment concern.** Local calls required
  authorizing the current egress IP. Vercel's outbound IPs are dynamic, so
  production will need IP blocking disabled, static egress, or a scoped M2M token.
- **Brevo adds a `List-Unsubscribe` header** to transactional mail; Gmail may show
  its own unsubscribe control. The free plan cannot remove it. Domain
  authentication is the main deliverability fix.
- **Password-reset tokens are stored raw** by Better Auth in
  `verification.identifier` (the identifier includes the token). They are
  single-use and expire in one hour. Replacing this needs a custom reset flow.
- **Rate limiting is per-instance memory** and only active in production. It
  slows basic brute force but is not a shared limiter.
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
- The home page is still a temporary development placeholder; the real landing
  page is Phase 7.

## 10. Resuming in a fresh session

1. Read this file, then `DEVELOPMENT_PLAN.md`, then `AGENTS.md`.
2. Run `npm ci` and `npm run check`; confirm `TEST_DATABASE_URL` for integration.
3. Start local Postgres if needed and confirm `DATABASE_URL` / `DIRECT_URL`.
4. Check the blockers and known limitations above.
5. Do not start Phase 4 without explicit approval; do not push without approval.
6. At the end of any work: update this file, run `npm run check` and
   `npm run build`, report honestly, and stop.
