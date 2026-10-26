# AtlasShare — Progress

**Current phase:** Phase 4 — Shared maps (**built and verified, awaiting
approval**).
**Status:** Phases 1–3 are approved. Phase 4 is implemented, checked, and
browser-tested in production mode; it needs owner approval before Phase 5 starts.
**Last updated:** 2026-10-26.

This is the first file to read when resuming work. It reflects what is actually
built, not what is planned. Plans live in `DEVELOPMENT_PLAN.md`.

## 1. Phase status

| Phase | Status | Notes |
| --- | --- | --- |
| 1. Foundation & planning | ✅ Complete (approved) | Runnable branded skeleton + full docs. Commit `ad7746c`. |
| 2. Accounts & authentication | ✅ Complete (approved 2026-10-26) | Auth, settings, reset, email plumbing, first migration. |
| 3. Country dataset & personal map | ✅ Complete (approved 2026-10-26) | 250-unit dataset, private map, visited toggle, integration tests, browser QA. |
| 4. Shared maps | ✅ Built, awaiting approval (2026-10-26) | Create/manage maps, invitations, member roles, combined read-only view, two-account QA. |
| 5. Insights & filters | ⛔ Not started | D2 resolved: no notes/dates; filters/stats only. |
| 6. Image export | ⛔ Not started | — |
| 7. Public site & PWA | ⛔ Not started | — |
| 8. Hardening, QA & deployment | ⛔ Not started | — |

## 2. What exists today

### Shared maps (Phase 4)

- Signed-in pages: `/shared` lists the maps a user belongs to and creates a new
  map; `/shared/[mapId]` shows the combined view, member list, and owner
  controls; `/invite/[token]` previews and accepts an invitation. Non-members
  receive the app's 404 page for a map id.
- The shared-map tables already existed from the Phase 2 migration. Phase 4 uses
  them as-is: **no new migration or schema change** was needed.
- Creating a map inserts the map and the owner's `OWNER` membership in one
  transaction. Any signed-in user can create a map; creating maps is not
  limited beyond the existing auth rate limits.
- Owner actions: rename/update description, invite by email, revoke pending
  invitations, remove members, and delete the map after typing `DELETE`.
  Members can leave; the owner cannot leave and must delete instead. Removing a
  member or leaving deletes only the membership, never the person's private
  visits.
- Invitations use 32 random bytes (43-character base64url), stored as SHA-256
  hex. They expire after 7 days, are single-use, and are revocable. Acceptance is
  an atomic conditional update followed by membership creation. Re-inviting the
  same email revokes the previous pending link in the same transaction.
- Invitation preview and acceptance require the signed-in account email to match
  the invited address. Invalid, expired, revoked, used, and malformed tokens get
  a generic unavailable state; a different signed-in email gets a distinct
  message but never sees the map name. Pending invitation emails are only
  queried for the owner.
- Invitation email is best-effort via Brevo and contains only the map name and
  link. The owner can always copy the link from the UI if delivery is skipped or
  fails. The raw token is never logged by application code.
- The combined view is computed server-side from an authorization-scoped query.
  The client receives each member's display name, membership id, and deduplicated
  country-code set (needed for the filter), plus combined country counts. It does
  not receive emails, user ids, raw visit rows, notes, or visit dates.
- Shared maps are read-only for everyone, including the owner. The map surface
  has no checkboxes or toggles; members change their own map from `/map`. The
  filter switches between everyone and one member, and the counts/list follow it.
- `/shared` and `/shared/[mapId]` are optimistically protected by `proxy.ts` and
  re-checked with `requireSession()` / `requireMapAccess()` on the server.
  `/invite/[token]` is public so a signed-out recipient can sign in or create an
  account; the raw token is shown only in the URL path.
- `safeNextPath` restricts post-auth redirects to same-origin paths. Sign-in and
  sign-up preserve an invitation `next` parameter; the invite page uses a
  no-referrer metadata tag and response headers (plus noindex and no-store).
- Shared navigation, account/home/footer copy, read-only map CSS, and the
  create-map/invite/settings/delete/revoke/remove/leave forms are implemented.

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
- Narrow screens show the map first, with the country list below, and no
  pan/zoom dependency. From `lg` upward the map and list are side by side. At
  320/390 px there is no horizontal overflow; this was fixed after finding an
  intrinsic grid width of 463 px (`grid-cols-1` + `min-w-0`).
- Four client auth forms now use `method="post"` so a failed JavaScript boot
  cannot put a password into the URL.
- Home page and README report Phase 4; the landing page itself is still the
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

No insights/filters (Phase 5), no image export (Phase 6), no final landing page
or PWA (Phase 7), no CI, and no deployment. The shared-map tables are now used by
the Phase 4 UI and actions; there was no Phase 4 migration. Visited state has no
notes or dates (D2).

## 3. Verification

### Phase 4 verification (2026-10-26)

Environment: macOS, Node v24.13.1, npm 11.8.0, local PostgreSQL 18, Chrome 148
(headless CDP, the app browser pane, and a separate headless Chrome CDP session),
production build served on `localhost:3001` because port 3000 was occupied by
another project. Runtime `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` were
`http://localhost:3001`.

| Check | Command / method | Result |
| --- | --- | --- |
| Lint | `npm run lint` | ✅ exit 0 |
| Types | `npm run typecheck` | ✅ exit 0 |
| Tests | `npm test` | ✅ **105/105 passed (17 files)** |
| Full check | `npm run check` | ✅ exit 0 |
| Production build | `npm run build` | ✅ exit 0; `/shared`, `/shared/[mapId]`, `/invite/[token]` present |
| Shared-map data | 11 local PostgreSQL integration tests | ✅ counts, privacy shape, invitation states/concurrency, member removal/leave, ownership |
| Action authorization | 17 action tests | ✅ non-member/non-owner, validation, email outcome, redirects |
| Two-account flow | production browser | ✅ owner NO+SE (2), member FR+SE (2), combined 3; filter owner 2 |
| Invite wrong email | production browser | ✅ rejected, map name hidden |
| Invite accept | production browser | ✅ member joined; 2 members; `?joined=1`; member controls absent |
| Used / revoked / malformed token | browser + tests | ✅ generic unavailable state |
| Owner rename/revoke/remove/delete | production browser | ✅ rename persisted; revoke invalidated link; remove changed combined 3→2; delete removed map and detail returned HTTP 404 |
| Member leave | production browser | ✅ redirected to `/shared?left=1`; personal map still FR+SE (2 of 250) |
| Read-only shared map | browser inspection | ✅ 250 paths, 0 checkboxes, read-only class/cursor |
| Invite token headers | `curl -D -` | ✅ `Referrer-Policy: no-referrer`, `X-Robots-Tag`, `Cache-Control: private, no-store` |
| Responsive layout | headless Chrome CDP at 320/390 px | ✅ landing, `/shared`, `/shared/[mapId]`, `/map`; document width equals viewport; no page overflow |
| Migration | schema review | ✅ no Phase 4 schema change or migration; Phase 2 tables reused |
| Invitation inbox delivery/render | Brevo | ⬜ send path ran; delivery/opening and visual rendering not verified |
| Expired invite in browser | integration test only | ⬜ covered by test, not browser |
| Physical touch / Safari / Firefox | manual | ⬜ not run |
| Keyboard / screen reader | manual | ⬜ not run |
| Visual design approval | human review | ⬜ delegated to the owner |

#### Phase 4 defects found and fixed

- **Landing header overflowed at 320 px.** The brand and “Create account” button
  exceeded the viewport and were clipped by the landing page's `overflow-hidden`;
  the header now scales the wordmark, tightens gaps, and hides the duplicate
  “Sign in” link below `sm` (the hero keeps both calls to action).
- **Landing page still reported Phase 3 and “sharing comes next”.** Updated the
  badge, status card, and footer to Phase 4.
- **Invite form had duplicate live regions.** Removed the `sr-only` status and
  kept one visible `role="status"`/`aria-live` node; copy status resets when a
  new invitation is submitted.
- **Single-member shared maps said “1 of 1 members”.** Corrected the plural.

### Phase 3 verification (2026-10-26)

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
| Mobile layout | Chrome 320/390 px | ✅ map first, list follows (map top 711/603 px vs list 1183/1091 px); no horizontal overflow after `grid-cols-1`/`min-w-0` fix |
| Auth after form change | production browser | ✅ sign-in and sign-up work with `method="post"` |
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
  320/390 px the page now equals the viewport width.
- **Map/list order.** The list had an `order-first` class on narrow screens,
  putting countries above the map. The owner asked for the map on top. Removed
  the order override: the map is first, the country list follows.
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
- Proxy only performs optimistic cookie checks for `/account` and `/shared`;
  auth pages are not redirected by cookie presence (avoids rotation races and
  lets a signed-in user reach sign-in).
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
- On narrow screens, put the map first and the country list below it; from `lg`
  upward, place them side by side. Keep the list keyboard-accessible.
- No new database migration; `visited_countries` from Phase 2 is sufficient.
- Auth forms submit with `method="post"`; this is a hardening fix, not a new auth
  flow.

### Phase 4 decisions

Full records in ADR-012, ADR-013, and ADR-026.

- Shared maps are explicit-membership only: no public links, anonymous viewing,
  or “anyone with the link” access.
- All members see each other's display names and country-level marks for the
  filter; the client receives membership ids and deduplicated country-code sets,
  never emails, user ids, raw visit rows, notes, or dates. Pending invitation
  emails are owner-only.
- Owner and member roles only. The owner manages details, invitations, members,
  and deletion; members can leave. The owner cannot leave.
- The shared map is read-only for everyone; personal visits are changed only on
  `/map`. Removing a member or leaving never deletes private visits.
- Invitations are 7-day, single-use, per-email, hashed at rest, revocable, and
  re-inviting replaces the prior pending link. Email delivery is best-effort;
  the owner can always copy the link.
- Destructive map deletion requires typing `DELETE`; member removal/leave are
  confirmations but do not delete personal data.
- Post-auth redirects use `safeNextPath`; only same-origin paths are accepted.
- The shared-map tables already existed, so Phase 4 added no migration. New
  routes/actions reuse the existing schema and indexes.
- Invitation acceptance is not rate-limited. Token entropy is 256 bits and a
  valid link still requires the matching signed-in email, but a forwarded link
  can be redeemed by whoever can register the unverified invited address first.
  This is recorded as an accepted risk, not claimed as solved.

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
| Phase 4 approval | built and verified; not yet approved | Starting Phase 5 |
| Neon dev branch + connection strings | connected; Phase 2 migration applied | Deployment verification |
| Brevo account + verified sender | configured; prior test delivered/opened | Reset/invitation email validation |
| Brevo production domain authentication | optional; not configured | Better deliverability in Phase 8 |
| Approval to push to `origin` | not given | Sharing the repository |
| Domain name (optional) | undecided | Phase 8 |

Phase 1–3 are approved. Phase 4 is built and verified and awaits explicit
approval before Phase 5. No credentials are committed; `.env.example` documents
the expected variables.

## 7. Repository state

- Local git repository on `main`. Phase 1 is `ad7746c`; Phase 2 is `3065b2f`;
  the Phase 2 documentation commit is `6ae3b7c`.
- Phase 3 is committed locally in `0abebaf` plus the map-order follow-up; run
  `git log --oneline` for the exact history. Phase 4 is committed locally after
  the final check; run `git log --oneline` for its hash. **Not pushed** — pushing
  needs explicit approval.
- Remote `origin` = `https://github.com/katerikoti/AtlasShare.git`.
- `gh` CLI is not installed; git credentials are cached.
- `package-lock.json` is committed; `node_modules`, `.next`, `.env*`,
  `src/generated`, and `tsbuildinfo` are ignored.
- Phase 4 browser QA created `phase4.owner@example.com` and
  `phase4.member@example.com` plus a “Mobile QA” shared map. Both accounts were
  deleted after QA; Prisma cascades removed their sessions, visits, memberships,
  invitations, and the owned map. The Phase 3 smoke account was already deleted.

## 8. Next steps

1. Owner reviews Phase 4 and explicitly approves or requests changes.
2. Do not start Phase 5 until that approval; do not push without permission.
3. Complete the remaining manual checks if desired: physical touch, Safari and
   Firefox, keyboard-only, screen reader, invite-email rendering, and visual
   design approval.
4. Decide before launch whether to remove the unused `note` /
   `firstVisitedAt` columns or keep them reserved.
5. Keep the shared-rate-limit, email-verification, and invitation-token log
   concerns on the pre-launch/Phase 8 list.
6. Clean up local QA accounts and maps before any production data is used.

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
- **No pan/zoom.** Narrow screens show the map first and the list below; the map
  is a visual shortcut, not the only input.
- **Shared maps are read-only and not real-time.** Members update their own map
  on `/map`; the shared page reflects accepted membership and country changes on
  the next request/revalidation. There is no live presence, comments, or owner
  transfer.
- **Member names are visible to all members of a map**, by design, so the filter
  can identify people. Emails, user ids, raw visit rows, notes, and visit dates
  are not sent to the shared view. Pending invitation emails are owner-only.
- **Invitation tokens are in the URL path.** Application code does not log them,
  and invite responses send `Referrer-Policy: no-referrer`, `X-Robots-Tag`, and
  `Cache-Control: private, no-store`. Hosting/proxy access logs can still record
  the path, so production log retention and access must be restricted.
- **Invitation acceptance and invitation creation are not rate-limited.**
  Acceptance tokens have 256 bits of entropy; guessing is infeasible. A forwarded
  link can satisfy the email check by registering the unverified invited address
  first (see the email-verification limitation).
- **Email delivery is verified through Brevo**, but visual rendering and the
  password-reset message through the app still need a human check. The welcome
  and invitation messages are not retried if email is disabled or fails.
- **Invitation email delivery is best-effort**; the owner can copy the link. No
  resend, delivery webhook, bounce suppression, or retry queue is implemented.
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
- **Auth rate limiting is per-instance memory** and only active in production.
  It slows basic brute force on sign-in/sign-up/reset but is not a shared limiter
  and does not cover shared-map Server Actions.
- **No email verification, MFA, or OAuth.** Shared invitations match the account's
  email string, but the address is not verified. If an attacker has a forwarded
  link and can register the unregistered invited address first, the email check
  can be satisfied. Requiring verified email before acceptance is a pre-launch
  hardening task; sign-up also reports that an address already exists.
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
5. Do not start Phase 5 without explicit approval; do not push without approval.
6. At the end of any work: update this file, run `npm run check` and
   `npm run build`, report honestly, and stop.
