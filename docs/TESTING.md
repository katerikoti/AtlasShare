# AtlasShare — Testing

Status: **Phase 2 complete and approved (2026-10-26).** 46 automated tests in 8
files. Database, auth, email, and browser behavior were also checked manually;
the exact pass/blocked/not-run state is below. Results are from 2026-10-26 for
lint/types/tests/build; the earlier manual app checks were run on 2026-10-25
(macOS, Node 24.13.1, npm 11.8.0, local PostgreSQL 18, Chrome headless,
production build on port 3102).

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
| Unit | Vitest 5 | Every check | ✅ 46 tests / 8 files |
| Component | Vitest + React Testing Library + jsdom | Every check | ✅ configured (no component tests yet) |
| Data integrity | Vitest over the country dataset | Phase 3 | ⬜ planned |
| Integration (DB) | Vitest against `TEST_DATABASE_URL` | When wired up | ⬜ not automated; manual checks done |
| End-to-end | Playwright (Phase 8) | CI / pre-release | ⬜ planned; manual browser/API checks done |
| Accessibility | axe + manual keyboard/screen-reader | Each UI phase; full audit Phase 8 | ⬜ manual partial |
| Visual/layout | Headless Chrome metrics + manual screenshots | Each UI phase | ✅ Phase 2 metrics |

## 3. Commands

```bash
npm run lint        # ESLint
npm run typecheck   # next typegen && tsc --noEmit
npm test            # Vitest, single run
npm run test:watch  # Vitest, watch mode
npm run check       # lint + typecheck + test
npm run build       # production build
npm start           # serve the production build (after build)

npm run db:generate # Prisma client (also runs on postinstall)
npm run db:migrate  # prisma migrate dev (local development)
npm run db:deploy   # prisma migrate deploy (release/CI)
npm run db:studio   # Prisma Studio
```

`next typegen` must run before `tsc` because Next 16 generates route types
(`LayoutProps<"/">`) into `.next/types`. Running `tsc` alone on a clean checkout
fails.

## 4. Phase 2 automated tests

### 4.1 `npm run lint`

- Command: `npm run lint`
- Result: **passed**, exit 0, no warnings or errors.

### 4.2 `npm run typecheck`

- Command: `npm run typecheck` (`next typegen && tsc --noEmit`)
- Result: **passed**, exit 0.

### 4.3 `npm test`

- Command: `npm test`
- Result: **passed**, 46/46 tests in 8 files.
- Coverage by file:
  - `src/config/brand.test.ts` — product name and WCAG contrast (4).
  - `src/config/env.test.ts` — lazy env parsing, missing/malformed values, short
    secrets, memoization (5).
  - `src/server/email/templates.test.ts` — welcome/reset content, escaping, no
    stray tokens (6).
  - `src/server/email/welcome.test.ts` — once-only claim, skip without config,
    release/rethrow on failure (4).
  - `src/server/email/mailer.test.ts` — Brevo request shape, sender parsing,
    provider errors, empty success responses (6).
  - `src/server/validation/account.test.ts` — name, password, confirmation, and
    DELETE validation (11).
  - `src/server/session.test.ts` — `requireSession` redirects without a session
    and returns a real one (2).
  - `src/server/actions/account.auth.test.ts` — all three account actions reject
    unauthenticated callers before calling Better Auth; authorized validation
    paths and password-change session revocation (8).
- What is **not** covered automatically: database writes, Better Auth itself,
  email delivery, browser routing, and the proxy. Those were checked manually.

### 4.4 `npm run build`

- Command: `npm run build`
- Result: **passed**, exit 0.
- Routes:
  - static (`○`): `/`, `/_not-found`, `/sign-in`, `/sign-up`,
    `/forgot-password`.
  - dynamic (`ƒ`): `/account`, `/reset-password`, `/api/auth/[...all]`.
- Proxy is compiled as middleware.
- The build does **not** require runtime secrets; env/auth/database are lazy, and
  the authenticated `(app)` layout is forced dynamic. Verified by re-running the
  build with `.env` temporarily removed: **passed**.

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
- Visual rendering and password-reset delivery are not confirmed yet.

## 5. Phase 2 manual verification

### 5.1 Production smoke and auth flows

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

### 5.2 Layout and accessibility measurements

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

### 5.3 Not run or blocked in Phase 2

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

### 5.4 Phase 1 results (historical)

Phase 1 passed lint, typecheck, 4/4 tests, build, production smoke, 404, and
320/390/1280 layout checks. The detailed record is in the Phase 1 commit and
`CHANGELOG.md`; Phase 2 supersedes those counts.

## 6. Test data and fixtures

- Local Postgres databases: `atlasshare_dev` for development/manual checks and
  `atlasshare_test` for migration verification. `TEST_DATABASE_URL` is
  documented but not yet used by Vitest.
- Manual browser/API checks used unique `example.com` addresses.
- No database fixtures are committed.
- When integration tests are wired up, they must create unique rows per run and
  clean up; `TEST_DATABASE_URL` must never point at production.
- Country fixtures will use real ISO codes from the committed dataset; tests
  must fail if a fixture code is not in the dataset.

## 7. Accessibility testing plan

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

## 8. Manual QA checklist (feature phases)

Phase 2 status shown where checked.

- [x] Happy path on desktop: sign up, account settings, reset, delete.
- [ ] Happy path on a physical phone (layout measured at 320/390 only).
- [x] Error states for wrong password, duplicate sign-up, short password,
  mismatched new passwords, wrong DELETE confirmation.
- [ ] Refresh mid-flow for every future mutation.
- [ ] Two accounts: isolation holds (no shared data yet).
- [ ] Non-member/non-owner attempts fail (Phase 4 resources).
- [x] Sign out, then sign in as another user: no cached personal data.
- [ ] Long text (80/280 chars) does not break layout.
- [ ] Offline (after PWA exists): branded offline page, no private cache.
- [x] Unauthenticated `/account` and fake-cookie `/account` redirect.

## 9. CI (planned)

When the repo gets CI (Phase 2/8):

```bash
npm ci
npm run check
npm run build
```

Integration tests run only when `TEST_DATABASE_URL` is configured; otherwise
they are skipped and the run is reported as such. The build must not need
secrets: database access at build time is avoided by lazy env/auth/database
initialization and dynamic rendering.

## 10. Known gaps

- No browser-level regression tests yet.
- No automated test that a forged server-action request is rejected at the HTTP
  layer; the action-level Vitest suite proves the gate is called, and manual
  fake-cookie checks cover the page layer.
- No automated DB tests for cascades or visit isolation; manual SQL was used.
- No test that client bundles contain no secrets. Planned for Phase 8 (grep the
  build output for known secret patterns).
- No load testing or rate-limit verification. At this scale, not justified yet.
