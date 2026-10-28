# Changelog

Notable changes, newest first. This project follows a phase-based plan; see
`DEVELOPMENT_PLAN.md`. Version numbers are not yet meaningful for the product
(no release), but the package version is tracked.

## [Unreleased]

### Added — Phase 8: email verification by 6-digit code (2026-10-28, ADR-036)

- Sign-up now creates an unverified account with no session and emails a 6-digit
  code (valid 10 minutes, 5 attempts, single use, stored hashed). The form shows a
  "Check your email" step; a correct code verifies the address and signs the
  person in, then the welcome email is sent (it moved from account creation to
  after verification). "Send a new code" has a 60-second cooldown.
- Signing in to an account that was never verified (after the correct password)
  emails a fresh code and shows the same step. Wrong passwords still get the
  generic message.
- A new sign-up for an address with only an unverified account replaces it, so
  registering someone else's address cannot hijack their later verification.
- Better Auth's `emailOTP` plugin is used with passwordless sign-in and
  reset-by-code disabled. A development-only fallback prints the code to the
  server console when mail cannot be sent; production never logs a code.
- New: `VerifyEmailForm`, `renderVerificationCodeEmail`,
  `sendVerificationCodeEmail`, `src/server/unverified-accounts.ts`. 27 new tests
  (194 in 32 files).
- The two existing accounts were marked verified once with a one-off SQL update
  (not a migration). The privacy page now mentions the verification code.
- Docs: SECURITY (verification is enforced; accepted-risk table updated), ADR-036
  (and ADR-028 marked resolved), DATABASE, ARCHITECTURE, DEPLOYMENT (email is now
  on the sign-up critical path), PROJECT_SPECIFICATION (FR-A5, FR-A7).
- Phase 8 was started by the owner on 2026-10-28; this is its first item.
### Added — Phase 7: public site and PWA (2026-10-27)

- Public landing page (`/`), privacy page, and install page (`/install`) with
  shared chrome; signed-in visitors are redirected from `/` to `/map`.
- Web manifest, icon set, `robots.ts`, `sitemap.ts`, Open Graph/Twitter images,
  an offline-shell service worker (navigations network-only, public static assets
  only, denylist for private paths, cache cleared on sign-out), a self-contained
  `/offline` page, and a "newer version ready" update prompt.
- Logo assets in `public/brand/` (transparent mark, solid mark, lockup) used in
  the public, signed-in, and auth headers; PWA, Apple, and browser icons are
  generated from the solid mark. `icon.svg` and `favicon.ico` were removed.
- `brand.portfolioUrl` and a "Made by Katerina Mäenpää" footer credit.

### Changed — privacy page (2026-10-28)

- Removed the "Questions" section, whose link to the GitHub issue tracker did not
  work, and bumped "Last updated" to 28 October 2026. The rest of the page was
  re-read against the current app and still matches (nothing new is stored: map
  zoom and the phone navigation are view-only, and exports are unchanged). The
  page no longer offers a contact route; account deletion remains self-service
  on the Account page.

### Changed — phone footer and export buttons (2026-10-28, ADR-035)

- Phones only (desktop unchanged): the signed-in footer is hidden, and the
  "About the map data" attribution is hidden under the Home and shared maps. The
  Account page gained a phone-only **About** section with Privacy, "Made by
  Katerina Mäenpää", the attribution, and the © line.
- The Preview and Download buttons are equal-width and side by side on phones
  (they were one small and one full-width); while working, Download shows
  "Preparing…".

### Added — app-style phone navigation (2026-10-28, ADR-035)

- On phones the signed-in app now has a top bar with the logo and an icon-only
  Sign out, and a fixed bottom tab bar: Shared (left), Home (middle), Account
  (right), icons with short labels and the current page highlighted. Desktop
  keeps the text links in the top bar (now with the current page marked).
- New `src/components/app/app-nav.tsx` (`DesktopNav`, `MobileTabBar`);
  `SignOutButton` gained an opt-in `iconOnlyOnMobile` prop (the invite page keeps
  its text button). `viewport-fit=cover` plus safe-area padding keep the bar clear
  of the iPhone home indicator, and the body pads the left/right insets.
- 4 new tests; the total is now 167 in 29 files.

### Added — map zoom and pan (2026-10-28, ADR-035)

- Both the personal and the shared world map can be zoomed 1×–8× and panned:
  Reset / − / + buttons, two-finger pinch, Ctrl/⌘ + scroll, and drag once zoomed.
  Plain scroll still scrolls the page. A drag never marks a country; a tap still
  does. Zoom is view-only (not persisted, not in the export image).
- New `src/components/map/zoomable-map.tsx` and pure `src/lib/map-zoom.ts`; no new
  dependency. 16 new tests (9 for the math, 7 for the component).

### Changed — owner follow-up revisions (2026-10-28, ADR-035)

- Signed-in header nav: "Map" is now "Home" (still `/map`).
- Export button: "Share or download image" is now **Download** (behavior
  unchanged; the native share sheet still opens where supported).
- `/shared`: the "Maps you belong to" cards alternate green and pink: green,
  pink, green, pink… in one column (mobile), and a checkerboard (green, pink /
  pink, green / …) in two columns (`sm` and up). Pink cards use darker secondary
  text for contrast. The sequence lives in `src/lib/card-tones.ts` (3 tests).
- Shared map: Members, Invite someone, and Pending invitations moved out of
  **Show more** into one closed **Members and settings** dropdown at the bottom
  of the page, together with Map details and the Danger zone (just **Members**
  for non-owners). **Show more** now holds only the member checkboxes and Compare
  progress. The client `SharedMapExperience` no longer takes a `membersPanel`
  prop.

### Changed — owner UI revisions (2026-10-27, ADR-035)

- Landing: simplified hero copy, rose calls to action, a three-card "See where
  you've been" section, a green "How it works" panel whose step 2 links to
  `/install`, and a rose closing panel. Header is Sign in / Create account /
  Install (highlighted); Privacy is footer-only. Footer is © AtlasShare, the
  portfolio credit, Privacy, Map data; the repository link was removed, and the
  signed-in app footer now matches.
- Install page wording avoids technical terms ("app shell") and says a
  connection is needed to view or save a map.
- Personal map: "By region" is a closed dropdown.
- Shared list: "Maps you belong to:" now comes before "Create a shared map:".
- Shared map: summary card (X of 195, member count, percentage, progress bar)
  with a **Show more** dropdown containing member checkboxes (All + each member),
  Compare progress, and Members with Invite someone and Pending invitations
  (owner only). The map legend and the privacy sentence under the country list
  were removed. A comparison can be toggled off, and changing members returns to
  the combined view.
- Export panel: a rose **Preview** toggle replaces the always-visible image on
  personal and shared maps; the on-screen privacy paragraph was removed.
- Test count is now 144 (was 137): new coverage for the summary, Show more
  contents (member management is not in it), comparison toggle-off, member change after a
  comparison, a one-member map, and the Preview toggle on both maps.

### Fixed

- Sign-up/sign-in showed "Invalid origin" locally when the dev server ran on a
  different port from `NEXT_PUBLIC_APP_URL`/`BETTER_AUTH_URL`. Documented in the
  README; the local `.env` was aligned to the actual port.
- A one-member shared map with "All" checked was labeled as a single-member view;
  it is now the combined view.

### Added — Phase 6: image export (2026-10-27)

- High-resolution personal map export from a pure inline SVG: one 1600 × 1000
  landscape layout rasterized at 2× (3200 × 2000) through canvas.
- Optional user-entered image title, count/percentage, brand mark, year, and a
  clean country map. No account display name, email, id, member name, map name,
  per-member breakdown, note, or visit date can enter the export input.
- Web Share with a PNG file when supported, download fallback, and automatic SVG
  download when canvas creation fails. A cancelled share does not trigger a
  download.
- Export panel with live preview on the personal map and on shared maps. The
  shared page exports the combined marks of all members by default, or the
  selected member's marks, without member identities (owner revision,
  ADR-034).
- Test coverage for input sanitisation/minimal fields, 0/2/all visited, 195
  exported paths, no external assets, title-as-text escaping, combined shared
  export, comparison-view export staying combined, selected-member export, and
  absence of member names/map name.

### Changed — 195 recognized countries (2026-10-27)

- Replaced the 250-unit "countries & territories" dataset with exactly 195
  recognized countries: 193 UN member states plus the Holy See and Palestine.
  Removed dependent territories, Kosovo (`XK`), Taiwan (`TW`), Western Sahara
  (`EH`), and Antarctica (`AQ`).
- Generator now filters `@svg-maps/world@2.0.0` through one canonical 195-code
  list. The committed metadata and geometry both contain 195 entries and paths;
  Holy See is displayed as "Holy See (Vatican City)".
- Region taxonomy now has five continents totalling 54 + 35 + 48 + 44 + 14 =
  195. Copy and metadata say "countries", not "countries & territories".
- Added data migration `20261027120000_limit_to_recognized_countries` to delete
  visits to retired codes; unknown codes are also filtered at the server read
  boundary. Applied to the Neon development and local test databases.
- Removed the obsolete custom Antarctica asset and its Natural Earth notice.
  The only remaining geometry source is `@svg-maps/world` (CC-BY-4.0).

### Verified — Phase 6

- `npm run check` passed with **125 tests in 20 files** (including local
  PostgreSQL integration tests); `npm run build` passed.
- Production browser QA in headless Chrome: 195 checklist rows and 195 export
  paths; marking Sweden and Japan produced an export with exactly those two
  visited paths; image title rendered as text; no external export assets.
- Share path received `atlasshare-map-2026-2.png` (`image/png`, 827,474 bytes);
  download path produced a 3200 × 2000 PNG; canvas-disabled path downloaded the
  SVG fallback containing the two visited marks and no shared-map wording.
- Two-member shared-map QA: combined export contained SE, NO, FR, and JP;
  selected-member export contained FR and JP only; member names and map name were
  absent from the SVG. Share payload was `atlasshare-map-2026-4.png` (823,448
  bytes); PNG download was 3200 × 2000; SVG fallback retained the four combined
  marks.
- macOS Vision OCR read the title, count, percentage, tagline, and footer from
  the PNG without overlap; mobile 320/390 px had no horizontal scroll and kept
  the map above the list and export below it.
- Dataset conversion: focused and full tests pass, the migration is applied, and
  the build passes. The 195-country personal browser QA covered list length,
  export preview, and counts.
- Not verified: physical iOS Safari/Android Chrome share sheets, Firefox/Safari
  canvas output, and opening the shared attachment.

### Added — Phase 5: insights and filters (2026-10-27)

- Static continent-level region metadata for all units in the then-250-unit
  dataset (now 195 after ADR-032) in
  `src/data/country-regions.ts`, attached to the canonical country dataset.
  Assignment follows the UN M49 continent grouping and is covered by a
  one-region-per-unit test.
- Personal country list remains the simple search-only alphabetical checklist
  after owner review. A checked country name and its checkbox change to dusty
  rose; the per-row "visited"/"not visited" text, map legend, and visual-aid note
  were removed. Region statistics stay in the progress card.
- Region breakdown in the personal progress card with CSS bars, marked/total
  values per continent, and counts that sum to the headline visited total.
- Shared-map comparison derived from the authorized combined view: "Visited by
  everyone", "Only you", and "Not yet by anyone", with per-view counts, map
  titles, empty states, and region breakdowns. No new query, field, migration,
  or private data exposure.
- Shared list is height-limited and scrollable on mobile. Read-only shared
  behavior is unchanged.
- Pure region-count and shared-comparison helpers and tests. The initial
  filter/sort helpers were removed after owner review.

### Verified — Phase 5

- These browser counts were recorded on the original 250-unit dataset, before
  the 2026-10-27 revision to 195 recognized countries. The region totals and
  test expectations were subsequently updated to the five-continent 195 set.
- `npm run check` passed: lint, typecheck, and **114/114 tests in 18 files**
  (including 14 local PostgreSQL integration tests).
- `npm run build` passed; all existing routes remain dynamic/static as before.
  **No new migration was required.**
- Production browser QA on `localhost:3001` with a signed-in owner: the personal
  list stayed at 250 alphabetical rows with one search field and no filter/sort
  controls; search "swe" returned Sweden; checked names and checkboxes used
  rose. Region stats showed 1 Americas, 1 Asia, 2 Europe, and 4 marked total.
- Shared QA with two members: combined 5; comparison 2 visited-by-everyone,
  2 only-you, 245 not-yet-by-anyone; view-specific lists and region stats
  updated; zero checkboxes; map titles matched the selected view.
- Responsive metrics at 320/390/1280 px: no document horizontal overflow; map
  remained above the personal list on narrow screens; large shared lists
  scrolled inside their card.
- Manual gaps unchanged: physical touch, Safari/Firefox, keyboard-only and
  screen-reader walkthroughs, visual design approval, invitation inbox rendering,
  and Lighthouse on authenticated pages.

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
