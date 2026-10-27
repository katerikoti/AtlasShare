# AtlasShare — Testing

Status: **Phase 5 built and verified (2026-10-27), awaiting approval.**
114 automated tests in 18 files. Database persistence, auth, shared-map
authorization, map layout, search, region counts, and browser behavior were also
checked manually; the exact pass/blocked/not-run state is below. Results are from
2026-10-26–27 on macOS, Node 24.13.1, npm 11.8.0, local PostgreSQL 18, and Chrome
148 (headless CDP and the app's browser pane). Final `npm run check` and
production rebuild results are recorded in section 5.1.

## 1. Principles

- **Report honestly.** Passed, failed, skipped, and not-run are different
  states. A skipped test is never counted as a pass.
- Test behavior that can break silently: data integrity, authorization, money-
  like calculations (counts), and export contents.
- Every private resource gets a **negative** test: a non-member cannot read or
  mutate it.
- Prefer a few meaningful tests over shallow snapshot coverage. No snapshot
  tests of the whole page.
- Fix flaky tests or delete them with a reason. Never retry-until-green.

## 2. Layers

| Layer | Tool | Runs when | Status |
| --- | --- | --- | --- |
| Lint | ESLint 9 + `eslint-config-next` | Every check | ✅ configured |
| Types | `next typegen && tsc --noEmit` | Every check | ✅ configured |
| Unit/component | Vitest 5 + RTL + jsdom | Every check | ✅ 114 tests / 18 files total |
| Component | React Testing Library + jsdom | Every check | ✅ 10 map/shared-view tests |
| Data integrity | Vitest over the country dataset + insight helpers | Every check | ✅ 11 tests |
| Integration (DB) | Vitest against `TEST_DATABASE_URL` | Every check when test DB is configured; skipped otherwise | ✅ 14 tests (visits + shared maps); local test DB |
| End-to-end | Playwright (Phase 8) | CI / pre-release | ⬜ planned; manual browser checks done |
| Accessibility | Lighthouse/axe + manual keyboard/screen-reader | Each UI phase; full audit Phase 8 | ⬜ partial; public pages scored 100, manual keyboard/screen-reader not run |
| Visual/layout | Headless Chrome CDP metrics | Each UI phase | ✅ 320/390/1200/1280 metrics; visual review delegated |

## 3. Commands

```bash
npm run lint        # ESLint
npm run typecheck   # next typegen && tsc --noEmit
npm test            # Vitest, single run
npm run test:watch  # Vitest, watch mode
npm run check       # lint + typecheck + test
npm run build       # production build
npm start           # serve the production build (after build)

npm run data:countries # regenerate metadata + public map geometry

npm run db:generate # Prisma client (also runs on postinstall)
npm run db:migrate  # prisma migrate dev (local development)
npm run db:deploy   # prisma migrate deploy (release/CI)
npm run db:studio   # Prisma Studio
```

`next typegen` must run before `tsc` because Next 16 generates route types
(`LayoutProps<"/">`) into `.next/types`. Running `tsc` alone on a clean checkout
fails.

Integration tests load `.env` and use `TEST_DATABASE_URL` (the local
`atlasshare_test` database). They are skipped, not passed, when that variable is
absent. `npm test` therefore reports 114 passed locally; a fresh checkout without
the test DB reports 100 passed and 14 skipped unless the environment is set.

`npm run data:countries` requires `@svg-maps/world@2.0.0` exactly and rewrites
`src/data/countries.generated.ts` and `public/map/countries.json`. Run it twice
and compare hashes when changing the generator.

## 4. Automated tests through Phase 5

### 4.1 `npm run lint`

- Command: `npm run lint`
- Result: **passed**, exit 0, no warnings or errors.

### 4.2 `npm run typecheck`

- Command: `npm run typecheck` (`next typegen && tsc --noEmit`)
- Result: **passed**, exit 0.

### 4.3 `npm test`

- Command: `npm test`
- Result: **passed**, 114/114 tests in 18 files (2026-10-27, after the final
  owner-review simplification).
- Coverage by file:
  - `src/config/brand.test.ts` — product name, WCAG text contrast, and map border contrast (4).
  - `src/config/env.test.ts` — lazy env parsing, missing/malformed values, short
    secrets, memoization (5).
  - `src/server/email/templates.test.ts` — welcome/reset/invitation content,
    escaping, URL shape, no stray tokens (9).
  - `src/server/email/welcome.test.ts` — once-only claim, skip without config,
    release/rethrow on failure (4).
  - `src/server/email/mailer.test.ts` — Brevo request shape, sender parsing,
    provider errors, empty success responses (6).
  - `src/server/validation/account.test.ts` — name, password, confirmation, and
    DELETE validation (11).
  - `src/server/session.test.ts` — `requireSession` redirects without a session
    and returns a real one (2).
  - `src/server/actions/account.auth.test.ts` — account actions reject
    unauthenticated callers before Better Auth; validation and password-change
    session revocation (8).
  - `src/data/countries.test.ts` — exactly 250 unique units, names, special
    units, PS/IL separation, path completeness, lookup/sort, and exactly one
    region per unit (7).
  - `src/data/country-insights.test.ts` — region sums and unknown-code
    handling, and the three shared comparison sets including the single-member
    case (4).
  - `src/server/visits.integration.test.ts` — idempotent set/remove, user
    isolation against local Postgres (3).
  - `src/server/actions/visits.auth.test.ts` — unauthenticated rejection,
    dataset validation, boolean validation, successful persistence, safe error
    (5).
  - `src/components/map/map-experience.test.tsx` — accessible list and count,
    search and no-match state, optimistic mark with rose styling, rollback/error,
    and region statistics (5).
  - `src/server/shared-maps.integration.test.ts` — combined counts, member
    privacy shape, create/invite/accept/reinvite/revoke/remove/leave, expiry,
    wrong email, single-use and concurrency, owner invariants (11).
  - `src/server/actions/shared-maps.auth.test.ts` — every shared-map action
    rejects unauthenticated/non-member/non-owner callers as appropriate,
    validates input, and handles email outcomes (17).
  - `src/components/shared/shared-map-experience.test.tsx` — combined view,
    member filter, read-only state, comparison counts, only-you and nobody views,
    view-specific region stats (5).
  - `src/server/invitations.test.ts` — token entropy/format, hash/TTL, URL and
    path handling (5).
  - `src/lib/safe-redirect.test.ts` — same-origin redirects accepted; absolute,
    protocol-relative, backslash, control-character, and malformed targets
    rejected (3).
- What is **not** covered automatically: Better Auth itself, actual email
  delivery/rendering, browser routing, the proxy, real touch gestures, and
  screen-reader output. Database writes and shared-map authorization are covered
  by integration/action tests.

### 4.4 `npm run build`

- Command: `npm run build`
- Result: **passed**, exit 0.
- Routes:
  - static (`○`): `/`, `/_not-found`, `/sign-in`, `/sign-up`,
    `/forgot-password`.
  - dynamic (`ƒ`): `/account`, `/map`, `/shared`, `/shared/[mapId]`,
    `/invite/[token]`, `/reset-password`, `/api/auth/[...all]`.
- The map and shared routes are dynamic because they read the signed-in user's
  data; the public geometry is a static file under `public/map/`.
- Proxy is compiled as middleware and optimistically protects `/account` and
  `/shared`; every page/action re-checks authorization on the server.
- The build does **not** require runtime secrets; env/auth/database are lazy, and
  the authenticated `(app)` layout is forced dynamic. Verified by re-running the
  build with `.env` temporarily removed in Phase 3: **passed**.

### 4.5 Migration from an empty database

- Dropped and recreated `atlasshare_test`, then ran:

  ```bash
  DATABASE_URL=postgresql://…/atlasshare_test \
  DIRECT_URL=postgresql://…/atlasshare_test \
  npx prisma migrate deploy
  ```

- Result: **passed**. One migration
  (`20261025141145_init_auth_and_accounts`) applied; nine tables exist including
  `_prisma_migrations`.

### 4.6 Neon dev branch

- `npx prisma migrate status` initially reported one pending migration against
  the connected Neon `dev` branch.
- `npm run db:deploy` applied `20261025141145_init_auth_and_accounts` using the
  direct connection.
- Re-running `npx prisma migrate status` reported: **Database schema is up to
  date.**
- The production branch and Vercel deployment remain unverified.

### 4.7 Brevo email delivery

- A direct Brevo API send returned **201** with a `messageId`.
- A production server sign-up on port 3103 returned **200**, and the welcome
  email was accepted by Brevo. The account's `welcomeEmailSentAt` was set, and the
  test user was deleted afterward.
- The follow-up message **“AtlasShare test 2”** was delivered and opened in the
  real inbox, confirming outbound delivery end to end.
- A second follow-up, **“AtlasShare test 3,”** was delivered and opened from the
  Gmail **Promotions** tab. The sent body has no unsubscribe link, but Brevo
  injects a `List-Unsubscribe` header, so Gmail displays its own unsubscribe
  control.
- The request required authorizing the local egress IP (Brevo returned 401
  `unauthorized` before that).
- Phase 4 ran the invitation send path through the action in browser QA; the UI
  reported the invitation as sent. The test recipient was an `example.com`
  address, so inbox delivery/rendering was not verified.
- Visual rendering of transactional email and password-reset delivery are still
  not confirmed.

## 5. Phase 5 automated and manual verification

### 5.1 Final checks

- `npm run lint`: **passed**, exit 0.
- `npm run typecheck`: **passed**, exit 0.
- `npm run check`: **passed**, lint + typecheck + **114/114 tests in 18 files**
  (2026-10-27, after the final owner-review simplification).
- `npm run build`: **passed** on 2026-10-27. Routes are unchanged:
  `/account`, `/map`, `/shared`, `/shared/[mapId]`, `/invite/[token]`,
  `/reset-password`, `/api/auth/[...all]` dynamic, with the public pages static.
  **No new migration** was created or needed.

### 5.2 Personal list and statistics

Served the production build at `http://localhost:3001` (port 3000 was occupied)
with the runtime auth/app URLs set to that origin. Used a real signed-in account
through headless Chrome CDP. After owner review, this section reflects the
simplified search-only list; the earlier filter/sort QA was superseded.

| Scenario | Result |
| --- | --- |
| Mark four countries | **pass** — Sweden, Norway, Japan, United States; progress 4 of 250 |
| List shape | **pass** — 250 alphabetical rows; only "Find a country" plus the checklist; zero selects and zero reset buttons |
| No filter controls | **pass** — no Show/Region/Sort labels, no "Showing 250 of 250" text |
| Search | **pass** — "swe" returned one row (Sweden); clearing restored 250 |
| Search no-match | **pass (component)** — no-match copy shown and the list is empty |
| Checked-row styling | **pass** — Sweden's name used `text-rose-deep` and its checkbox used `accent-rose-deep` |
| Row text | **pass** — each row showed the country name and code only; no "Visited"/"Not visited" text, no region sublabel |
| Removed map copy | **pass** — no map legend, no "Borders use moss", no "The map is a visual aid" note |
| Region breakdown | **pass** — 4 marked total: Americas 1 of 56, Asia 1 of 53, Europe 2 of 52, others 0; sums to 4 |

### 5.3 Shared comparison

A second member and a shared map were seeded in the local development database
for this phase's UI check. Owner visits: SE, NO, JP, US. Member visits: SE, FR,
JP. The shared view is read-only.

| Scenario | Result |
| --- | --- |
| Combined view | **pass** — 5 of 250; owner 4, member 3; region Europe 3, Asia 1, Americas 1 |
| Comparison counts | **pass** — visited by everyone 2 (JP, SE), only you 2 (NO, US), not yet by anyone 245 |
| "Visited by everyone" view | **pass** — 2 countries, list count and map title match the overlap |
| "Only you" view | **pass** — 2 countries, no other member's exclusive country leaked into the list |
| "Not yet by anyone" view | **pass** — 245 countries, "not marked yet" wording, scrollable list |
| Return to whole group | **pass** — counts, list, region stats, and map title restored |
| Region breakdown per view | **pass** — counts follow the selected set and use "not marked" for the nobody view |
| Read-only behavior | **pass** — zero checkboxes; no mutation controls on the shared view |
| Large-list usability | **pass** — 245 rows rendered in a height-limited scroll card |

### 5.4 Responsive and layout checks

- Headless Chrome CDP at **320, 390, and 1280 px** measured `/map` and
  `/shared/[mapId]`.
- `document.documentElement.scrollWidth` equaled the viewport at every width; no
  page-level horizontal scroll.
- At 320/390 px the personal map preceded the country list; the simplified list
  had no filter controls to fit. The search field and 250-row checklist stayed
  inside the card.
- At 1280 px the map and personal list remained side by side; shared controls and
  large lists stayed inside their cards.
- Mobile emulation is not a physical phone; visual design approval remains
  delegated to the owner.

### 5.5 Not run or not covered in Phase 5

- Physical-phone touch, Safari, and Firefox.
- Manual keyboard-only walkthrough and screen-reader output for the new search,
  region bars, and comparison views. Native controls were used and component tests
  query by role/label, but a human pass is still needed.
- Lighthouse on authenticated `/map` or `/shared/[mapId]`; the prior public-page
  audit remains 100/100/100.
- Visual design approval.
- Real-time refresh between two open browsers. Comparison is derived from the
  loaded request, not a subscription.
- Region taxonomy review at the edges (Cyprus, Türkiye, Russia, territories).
  This is documented as a convention in ADR-029.
- Export of statistics or charts; Phase 5 intentionally uses CSS bars only.

## 6. Phase 4 automated and manual verification

### 6.1 Final checks

- `npm run lint`: **passed**, exit 0.
- `npm run typecheck`: **passed**, exit 0.
- `npm run check`: **passed**, lint + typecheck + **105/105 tests in 17 files**
  (2026-10-27, after the final copy and member-removal revalidation edits).
- `npm run build`: **passed** on 2026-10-27. Dynamic routes: `/account`, `/map`,
  `/shared`, `/shared/[mapId]`, `/invite/[token]`, `/reset-password`,
  `/api/auth/[...all]`. **No new migration** was created or needed.
- `npm audit`: 8 advisories (1 critical, 3 high, 4 moderate), all in development
  tooling/nested dependencies. Runtime Better Auth is 1.7.12; the advisories are
  in `@better-auth/cli@1.4.21`'s nested Better Auth 1.4.21, drizzle-orm, lodash,
  and chevrotain. No production bundle/server path uses those vulnerable copies.
  Unresolved issues are recorded in `PROGRESS.md`; upgrade/replace before
  deployment.

### 6.2 Shared-map browser QA

Served the production build at `http://localhost:3001` (port 3000 was occupied)
with `BETTER_AUTH_URL` and runtime `NEXT_PUBLIC_APP_URL` set to that origin.
Used two local accounts, an in-app browser pane, and a separate headless Chrome
CDP session.

| Scenario | Result |
| --- | --- |
| Owner and member mark personal countries | **pass** — owner NO+SE (2), member FR+SE (2) |
| Create shared map | **pass** — owner membership created; detail page opened; list showed the map |
| Invite member by email | **pass** — single-use link generated; UI reported email sent |
| Invite a different email | **pass (blocked)** — distinct wrong-email state; map name not shown |
| Sign-out → sign-in from invite | **pass** — `next` returned to `/invite/[token]` |
| Accept invitation | **pass** — member joined; `?joined=1`; combined count 3; two members |
| Member filter | **pass** — owner filter showed 2; member list/count updated; “everyone” restored 3 |
| Member controls | **pass** — member saw the combined view but no owner management/remove controls |
| Read-only shared map | **pass** — 250 SVG paths, zero checkboxes/toggles |
| Used invitation | **pass (blocked)** — generic invalid/unavailable state; no second membership |
| Expired invitation | **pass (blocked, 2026-10-27)** — owner list removed the pending row after expiry; signed-in invited account saw the generic unavailable state, not the map name |
| Member leave | **pass** — redirected to `/shared?left=1`; map disappeared from list |
| Personal data after leaving | **pass** — member's `/map` still showed FR+SE (2 of 250) |
| Owner rename/description | **pass** — persisted on reload |
| Revoke pending invitation | **pass** — pending row removed; revoked link invalid |
| Re-invite and remove member | **pass** — re-invited, accepted, owner removed; combined 3→2; personal map still 2 |
| Delete map | **pass** — typed `DELETE`; list empty; detail returned HTTP 404 |
| Invite response headers | **pass** — `Referrer-Policy: no-referrer`, `X-Robots-Tag`, `Cache-Control: private, no-store` |
| Lighthouse (public pages) | **pass (2026-10-27)** — landing and invitation page scored 100 for accessibility, best practices, and SEO; no failures |
| Authenticated map from a signed-in account | **pass** — 250-country combined/read-only view; no raw rows exposed to the client (inspection + tests) |

### 6.3 Responsive and layout checks

- Headless Chrome CDP at **320 and 390 px** (mobile emulation) measured the
  landing page, `/shared`, `/shared/[mapId]`, and `/map`.
- `document.documentElement.scrollWidth` equaled the viewport at both widths;
  no page-level horizontal scroll. SVG paths can extend beyond the viewport
  inside the clipped map SVG, which is expected and does not widen the document.
- The shared detail sidebar/nav collapsed without page overflow; the filter,
  map card, country list, and owner forms stayed within the viewport.
- The 320 px landing header originally clipped “Create account”; after tightening
  the header (smaller wordmark/icon, smaller gaps, sign-in link hidden below
  `sm`, hero CTAs retained), the header fit. Metrics were re-run after the fix.
- Personal map remained map-first with the country list below; at desktop widths
  the existing side-by-side layout is unchanged.
- Responsive metrics use headless Chrome, not a physical phone. Visual design
  approval remains delegated to the owner.

### 6.4 Automation-tab artifact

The in-app browser pane runs a background/hidden tab; it can pause
`requestAnimationFrame`, leaving React's streamed Suspense segment hidden. The
map content was revealed by calling `$RV($RB)` manually. The visible headless
Chrome session rendered the same pages normally. This is a test-tool visibility
artifact, not an application loading bug. Do not “fix” the app by removing the
Suspense boundary.

### 6.5 Not run or not covered in Phase 4

- Physical-phone touch gestures, Safari, and Firefox.
- Manual keyboard-only walkthrough and screen-reader output for the shared and
  invite pages. Lighthouse covered the public landing and invitation pages only;
  authenticated shared-map pages were not audited.
- Invitation inbox delivery, rendering, bounce handling, and open tracking; the
  test recipient was an `example.com` address.
- Real-time updates between two open browsers. The view is request-time; open a
  fresh request/reload to see changes.
- Visual design approval. Screenshots/metrics were captured, but the agent did
  not approve the design.
- Response headers on a real production domain/CDN; checked locally.
- Shared-map rate limits and verified-email enforcement; they are not
  implemented and are recorded as accepted risks.

## 7. Phase 3 automated and manual verification

### 7.1 Dataset generation

- `npm run data:countries` completed and reported 250 units, 250 paths, and the
  viewBox. Running the generator twice produced identical UTF-8 output; the two
  committed outputs are deterministic.
- Automated checks confirm 250 unique alpha-2 units; non-empty unique names;
  separate `PS` and `IL`; `AQ`, `UM`, and `XK` present; a path for every unit; and
  a sorted lookup helper.
- The generator creates missing output directories and refuses any installed
  `@svg-maps/world` version other than `2.0.0`.
- The generated geometry is ~1.2 MB raw / 1,244,116 bytes; local production
  compression brought the browser transfer to ~398 KB. It is public data and
  must never contain a user's visited set.

### 7.2 Automated checks

- `npm test`: **passed**, 64/64 tests in 12 files. The three database integration
  tests ran against local `atlasshare_test`; they create two users, prove
  idempotent set/remove, and prove user isolation, then clean up.
- `npm run lint` and `npm run typecheck`: **passed** after the final Phase 3
  edits (see the result note below).
- `npm run build`: **passed**; `/map` is dynamic and `/map/countries.json` is a
  static public asset.
- `npm run check`: **passed** after the final Phase 3 edits (see the result note
  below).

### 7.3 Production browser and layout checks

- Served the production build at `http://127.0.0.1:3003` with
  `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to that origin. Used Chrome
  148 through CDP with a real signed-in session.
- The map rendered 250 SVG paths and the full 250-row country list. The initial
  account showed `0 of 250`; after marking Afghanistan it showed `1 of 250`,
  and the value persisted across a reload. The smoke user was removed afterward.
- At 1200 px the map and list render side by side (equal top position; map ~488
  px, list ~304 px) with no horizontal overflow.
- At 320 px and 390 px the map is first (top 711/603 px), the country list
  follows (top 1183/1091 px), and `document.documentElement.scrollWidth` equals
  the viewport (no horizontal scrolling) after adding `grid-cols-1`/`min-w-0`.
  Map card widths were 272 px at 320 and 342 px at 390. This fixed a real
  pre-release overflow: the grid's intrinsic item width had expanded the page to
  463 px on narrow screens. The initial list-first CSS override was removed
  after owner review because the map must stay above the list.
- Search for `japan` showed `1 of 250`; marking Japan updated the count to `2 of
  250`, persisted across reload, and unmarking returned it to `1 of 250`.
- Server-side integration tests prove two users' visits stay isolated. A
  cookie-less request to `/map` or `/account` returns `307` to `/sign-in`
  (`requireSession` for the map; the optimistic proxy for account); no visitor
  can reach another user's visit rows.
- The visible headless page reveals the Suspense boundary normally. A hidden
  automation tab pauses `requestAnimationFrame`, so React's streamed content
  stays in the hidden segment until revealed; this is a test-tool visibility
  effect, not a map defect. The in-app browser pane has the same hidden-tab
  limitation.
- Client auth forms now use `method="post"` so a failed JavaScript boot cannot
  put a password into the URL. Production sign-in and sign-up both remained
  functional after the change; a fresh QA account was created through the UI and
  deleted afterward.

### 7.4 Phase 3 not run or not covered

- No physical-phone test, real touch gesture test, or Safari/Firefox test.
- No manual keyboard tab/space walkthrough or screen-reader session; the list is
  built with native labeled checkboxes, but this remains unverified by AT.
- No axe scan.
- No manual route-error, geometry-fetch-error, retry, or offline test. The
  geometry error/retry UI and route error boundary exist and are unit-adjacent
  but not browser-tested.
- No throttled 3G/4G measurement of the 1.2 MB geometry asset or first
  interaction on a mid-range phone.
- No visual design review by the agent. Screenshots were captured at 320, 390,
  and 1280 px, but visual approval is delegated to the owner.

### 7.5 Final result

Final Phase 3 commands on 2026-10-26: `npm run lint`, `npm run typecheck`,
`npm run check`, and `npm run build` all exited 0. `npm run check` reported
64/64 tests in 12 files. The production server used for browser QA was rebuilt
after the mobile overflow fix; no files changed after that build except
documentation.

## 8. Phase 2 manual verification (historical)

### 8.1 Production smoke and auth flows

Served with `PORT=3102 BETTER_AUTH_URL=http://localhost:3102
NEXT_PUBLIC_APP_URL=http://localhost:3102 npm start` against local Postgres.

| Scenario | Result |
| --- | --- |
| Sign-up in browser | **pass** — account created, auto-signed-in, `/account` renders |
| Session cookie | **pass** — `HttpOnly`, `SameSite=Lax`, `Path=/`, 30-day `Max-Age`; `Secure` not observable over HTTP |
| `get-session` | **pass** — returns the signed-in user |
| Duplicate sign-up | **pass (expected error)** — 422, "User already exists" |
| Wrong password vs unknown email | **pass** — identical 401 "Invalid email or password" |
| Sign-out | **pass** — session cookie cleared, home page shown |
| Sign-in with new password | **pass** |
| Name update | **pass** — trimmed, revalidated, reflected in header and heading |
| Password change | **pass** — all sessions revoked, redirect to `/sign-in?passwordChanged=1`, notice visible, new password works |
| Forgot-password request | **pass** — generic response whether or not the email exists |
| Reset token | **pass** — readable only from the dev DB in this test; single-use; expires in 1 hour |
| Reset form at `/reset-password?token=…` | **pass** — updates password and shows success state |
| Account deletion | **pass** — password + `DELETE`; redirect to `/?account=deleted` |
| Cascades after deletion | **pass** — user, sessions, visits, owned map, membership, invitation all 0 |
| Fake session cookie on `/account` | **pass** — 307 to `/sign-in` from the server check |
| No cookie on `/account` | **pass** — 307 to `/sign-in` |
| Cross-origin auth POST | **pass** — 403 `INVALID_ORIGIN` |
| Short password sign-up | **pass (expected error)** — 400 `PASSWORD_TOO_SHORT` |

Test data lived only in the local `atlasshare_dev` database. Emails used
`example.com` addresses. No credentials or tokens were committed.

### 8.2 Layout and accessibility measurements

Headless Chrome via CDP at 320, 390, and 1280 px for `/`, `/sign-in`,
`/sign-up`, `/forgot-password`, `/reset-password`, `/account`, and a missing
page.

| Check | Result |
| --- | --- |
| Horizontal overflow | **none** at all widths on all pages |
| Input labels | **all** text inputs have a matching `<label for>` |
| Headings | **one `h1`** per page |
| Language | `lang="en"` |
| Background/text colors | canvas `rgb(233, 227, 221)`, ink `rgb(43, 48, 44)` |
| Console errors | none after adding `src/app/icon.svg`; only the deliberately requested missing page returns 404 |
| Focus visibility | Phase 1 outline styles still apply; not re-measured this phase |

### 8.3 Not run or blocked in Phase 2

| Check | Status | Why |
| --- | --- | --- |
| Real welcome email | **pass (delivery)** | App sign-up returned 200 and Brevo accepted the message; `welcomeEmailSentAt` was set. A follow-up test was delivered and opened. |
| Real password-reset email | **blocked** | Not yet exercised through the app; the token flow was previously tested by reading the token from the local DB. |
| Email rendering in a real client | **not confirmed** | A follow-up test was delivered and opened; visual rendering still needs a human check. |
| Gmail Primary-tab placement | **not confirmed** | Test 3 landed in Promotions. Brevo's `List-Unsubscribe` header and the unauthenticated sender likely contribute; domain authentication is the planned fix. |
| Neon production database | **blocked** | Dev branch connected and migrated; production deployment still pending. |
| Secure session cookie over HTTPS | **not run** | Local smoke test used HTTP; Better Auth applies `Secure` for HTTPS origins. |
| Rate-limit exhaustion | **not run** | Deliberately avoided locking the test IP for 15 minutes. |
| Automated DB integration tests | **not run** | Not wired into Vitest yet; manual SQL verification used. |
| Playwright e2e | **not run** | Phase 8. |
| axe / VoiceOver / keyboard-only pass | **not run** | No dedicated audit this phase. |
| Cross-browser (Safari/Firefox) | **not run** | Chrome only. |
| Lighthouse | **not run** | Meaningful after the map/landing page exist. |

### 8.4 Phase 1 results (historical)

Phase 1 passed lint, typecheck, 4/4 tests, build, production smoke, 404, and
320/390/1280 layout checks. The detailed record is in the Phase 1 commit and
`CHANGELOG.md`; Phase 2 supersedes those counts.

## 9. Test data and fixtures

- Local Postgres databases: `atlasshare_dev` for development/manual checks and
  `atlasshare_test` for the Vitest integration suite. `TEST_DATABASE_URL` is
  loaded from `.env`; the suite is skipped if it is absent.
- The integration suite creates unique users and visits per run and deletes the
  users in `afterAll`; cascades remove their visits. `TEST_DATABASE_URL` must
  never point at production.
- Manual browser/API checks use unique `example.com` addresses and delete them
  afterward. No database fixtures are committed.
- Country fixtures use real codes from the committed dataset; tests fail if a
  fixture code is not in the dataset.

## 10. Accessibility testing plan

Per UI phase:

1. Keyboard-only pass: reach every action, visible focus, no traps, sensible
   order.
2. Screen-reader spot check (VoiceOver on macOS/Safari at minimum).
3. axe DevTools or `@axe-core/playwright` once Playwright exists.
4. Contrast: automated for tokens; manual for new combinations.
5. Zoom to 200% and 320 px width; no content loss or horizontal scroll.
6. `prefers-reduced-motion` on: no essential animation.

The map needs special attention: the SVG is not 250 tab stops. The country list
is the accessible control surface; the SVG has an accessible name and reflects
state via text alternatives.

## 11. Manual QA checklist (feature phases)

Phase 4 additions are checked separately from the historical Phase 2/3 items.

Phase 4:

- [x] Owner and member see the combined view and correct counts (3); owner filter
  shows 2; member filtering works.
- [x] Invitation acceptance succeeds for the invited signed-in email; wrong email
  is rejected without revealing the map name.
- [x] Used and revoked invitations are rejected; expired acceptance is covered by
  the integration test (browser UI not exercised).
- [x] Member sees no owner management controls; shared map is read-only with 250
  paths and zero checkboxes.
- [x] Member leaves; the owner removes a member; personal map data remains (2).
- [x] Owner renames, revokes, re-invites, and deletes; deleted map returns 404.
- [x] Shared routes and landing page measured at 320/390 px; no page-level
  horizontal overflow.
- [x] Invite route sends no-referrer/noindex/no-store headers (curl).
- [ ] Physical phone touch and Safari/Firefox.
- [ ] Keyboard-only and screen-reader pass, axe scan.
- [ ] Expired-invitation browser state and real inbox delivery/rendering.
- [ ] Long map name/description and member-name wrapping at 320 px.
- [ ] Human visual design approval.
- [ ] Invitation rate limiting and verified-email enforcement (not implemented;
  accepted risks, not test gaps).

Phase 3:

- [x] Map loads 250 paths and the 250-row list with a real signed-in session.
- [x] Desktop map/list layout at 1200 px; no horizontal overflow.
- [x] Layout at 320/390 px: map first, list follows, no horizontal overflow.
- [x] Search filters the list; marking and unmarking updates the count.
- [x] Autosave survives reload; the database holds the desired state.
- [x] Two users' visits stay isolated (automated integration test).
- [ ] Physical phone touch and Safari/Firefox.
- [ ] Keyboard-only and screen-reader pass.
- [ ] Geometry error, retry, route error boundary, and offline map state.
- [ ] Visual design approval (screenshots captured; delegated to owner).

Phase 2 (historical):

- [x] Happy path on desktop: sign up, account settings, reset, delete.
- [ ] Happy path on a physical phone.
- [x] Error states for wrong password, duplicate sign-up, short password,
  mismatched new passwords, wrong DELETE confirmation.
- [ ] Refresh mid-flow for every mutation.
- [x] Sign out, then sign in as another user: no cached personal data.
- [ ] Long text (80/280 chars) does not break layout.
- [ ] Offline (after PWA exists): branded offline page, no private cache.
- [x] Unauthenticated `/account` and fake-cookie `/account` redirect.
- [x] Unauthenticated `/shared` redirect; non-member map access returns 404
  (action/integration tests; map page uses the signed-in member check).

## 12. CI (planned)

When the repo gets CI (Phase 8):

```bash
npm ci
npm run check
npm run build
```

Integration tests run only when `TEST_DATABASE_URL` is configured; otherwise
they are skipped and the run is reported as such. The build must not need
secrets: database access at build time is avoided by lazy env/auth/database
initialization and dynamic rendering.

## 13. Known gaps

- No browser-level regression tests yet.
- No automated test that a forged server-action request is rejected at the HTTP
  layer; the action-level Vitest suite proves the gate is called, and manual
  fake-cookie checks cover the page layer.
- No automated test for account/map cascade behavior beyond app-level deletion;
  manual SQL is still the check for foreign-key edge cases.
- No browser-level map test for geometry fetch failure, retry, or route error
  boundary.
- No automated layout regression (the 320 px overflows were caught manually in
  headless Chrome); a Playwright viewport test is planned for Phase 8.
- No test that client bundles contain no secrets. Planned for Phase 8 (grep the
  build output for known secret patterns).
- No load testing or shared-map rate-limit verification. At this scale, not
  justified yet; invitation acceptance currently has no rate limit.
- No automated test of production access logs for invitation tokens; app code
  does not log the token, but the hosting layer may record the path.
- No automated test that a forwarded invite cannot be redeemed by registering
  the unverified invited email; this is an accepted risk, not a solved case.
