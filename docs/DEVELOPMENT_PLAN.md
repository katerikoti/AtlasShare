# AtlasShare — Development Plan

Status: **Phase 4 built and verified (2026-10-26), awaiting approval.** Phases
1–3 are approved; Phase 5 has not started.

## How phases work

- Phases run in order. No work from a later phase is merged early, except a
  small enabling refactor that the current phase genuinely needs (and it is
  called out in `PROGRESS.md`).
- Each phase ends with: working software, `npm run check`, `npm run build`,
  honest test results, updated docs, and a short plain-English report.
- **Stop at the end of every phase.** The next phase starts only after explicit
  approval. Approval can change scope; changes are recorded in `DECISIONS.md`.
- Anything not implemented is described as planned, not implied to exist.
- Requirements use the IDs from `PROJECT_SPECIFICATION.md` for traceability.

## Phase overview

| # | Phase | Main outcome | Requirements |
| --- | --- | --- | --- |
| 1 | Foundation & planning | Runnable branded skeleton + docs | NFR-7, FR-X4 |
| 2 | Accounts & authentication | Sign up/in/out, reset, settings, DB live | FR-A1…A7 |
| 3 | Country dataset & personal map | Mark countries, see map + count | FR-M1…M9, D1 |
| 4 | Shared maps | Invite, join, combined view | FR-S1…S10 |
| 5 | Insights & filters | Filters, stats, comparison | FR-T2…T4 |
| 6 | Image export | Shareable PNG of your map | FR-E1…E5 |
| 7 | Public site & PWA | Landing, privacy, installable app | FR-P1…P5, FR-W1…W4 |
| 8 | Hardening, QA & deployment | Production launch readiness | NFR-1…8, §10 |

---

## Phase 1 — Foundation and planning ✅ (approved)

**Goal:** a repository that runs, is branded, is tested, and documents the
architecture before feature code exists.

**Scope**

- Next.js 16 + React 19 + TypeScript + Tailwind v4 scaffold, App Router.
- Brand config, design tokens, root metadata, temporary placeholder page, 404.
- Tooling: ESLint, Prettier-compatible formatting conventions (via editor),
  Vitest + RTL + jsdom, `check` script.
- Environment template, `.nvmrc`, `.gitignore`, project rules in `AGENTS.md`.
- Documentation set: specification, architecture, database, security, plan,
  testing, deployment, decisions, progress, changelog.
- Honest verification: lint, typecheck, unit tests, production build, smoke test.

**Acceptance criteria**

- [x] `npm run check` passes (lint, typecheck, tests).
- [x] `npm run build` succeeds and the app renders in production mode.
- [x] Brand name and palette are centralized; no scattered product-name literals.
- [x] Text contrast is unit-tested; reduced-motion and focus styles exist.
- [x] No secrets committed; `.env.example` documents required variables.
- [x] Docs describe the real state, including what is not built.
- [x] Local git repository with an initial commit.

**Not in this phase:** auth, database, map, shared maps, export, landing page,
PWA, deployment.

**Gate:** user reviews the report and approves.

---

## Phase 2 — Accounts and authentication ✅ (approved 2026-10-26)

**Goal:** a real account system backed by Postgres, with a usable settings page
and working transactional email.

**Scope delivered**

- Prisma 7 + first migration on local PostgreSQL 18; Neon remains the production
  target and is not provisioned. Runtime adapter selected by database host.
- `prisma.config.ts`, pooled/direct URL contract, and migration scripts.
- Better Auth: email/password, database sessions, Prisma adapter,
  `/api/auth/[...all]`, and a proxy that only protects `/account` optimistically.
- Lazy env validation; lazy auth/database initialization so builds need no
  secrets.
- Sign-up, sign-in, sign-out, password reset, welcome email via Brevo (or a
  logged no-op without a key).
- Account settings: display name, change password (signs out everywhere), delete
  account (password-gated, cascading).
- Production-only rate limits; generic sign-in errors; session cookie hardening.
- Route groups `(auth)` and `(app)`; a minimal signed-in shell.
- Unit tests for env/account validation, the session gate, and unauthenticated
  server-action rejection. DB and browser behavior verified manually.

**Acceptance criteria**

- [~] A new user can sign up, sign out, sign in, reset a password, change their
  name, and delete their account. **All verified locally in production mode.**
  Receiving a welcome email is **sent and accepted by Brevo**; inbox confirmation
  and reset-email delivery still need a human check.
- [x] Deleting an account removes its sessions and private rows (cascade verified
  for visits, owned maps, memberships, and invitations).
- [x] Password reset token is single-use and expires; the request response does
  not reveal whether an email exists.
- [~] Session cookie is HttpOnly and SameSite=Lax; `Secure` was not observable
  over local HTTP and must be confirmed on an HTTPS deployment.
- [x] Server actions reject unauthenticated calls; Vitest proves all three
  account actions redirect before calling Better Auth.
- [x] Migration applies cleanly from an empty database; `migrate deploy` is
  documented and was verified on a recreated test database.
- [~] Emails render correctly in a real client (manual check). **Partially
  verified:** Brevo accepted the welcome email and the reset mailer is wired, but
  visual rendering and reset delivery are not yet confirmed.
- [x] `npm run check`, `npm run build`, and the DB smoke test pass; results are
  recorded in `PROGRESS.md` and `TESTING.md`.
- [ ] Automated integration tests against `TEST_DATABASE_URL`. Not wired up;
  DB behavior was verified manually.

**Known deviations:** local Postgres replaced a Neon dev branch for Phase 2;
password-reset tokens are stored raw by Better Auth; real email delivery and the
Neon adapter are unverified.

**Not in this phase:** any map or country data; OAuth; MFA; email verification
enforcement; public pages.

**Gate:** user reviews the Phase 2 report and approves. Real email/Neon checks
remain before deployment.

---

## Phase 3 — Country dataset and personal map ✅ (approved 2026-10-26)

**Goal:** the core product moment — mark countries and see your map.

**Scope**

- D1 is resolved: 250 countries & territories, with Palestine (`PS`) and Israel
  (`IL`) as separate units. Generate the country dataset + SVG paths with a
  reproducible script; validate codes, names, and path coverage; assert both
  paths exist; commit outputs.
- Dataset integrity tests: unique codes, valid alpha-2, no missing names, path
  count matches the dataset.
- Reuse the Phase 2 `visited_countries` table; no new migration is needed.
  Idempotent toggle Server Action with server-side authorization and validation.
- Map route (signed-in): SVG map, legend, count, progress, searchable country
  list, keyboard support, empty state, responsive layout.
- Optimistic updates with rollback on failure; error surface.
- Loading/error boundaries; no private-data flash.
- Unit tests for dataset/counting; integration tests for toggle + isolation
  between two users.

**Acceptance criteria**

- Clicking a country marks it; reloading preserves it; clicking again removes it.
- Two users' maps are isolated (test proves user B cannot affect or read A).
- Keyboard-only and screen-reader users can mark/unmark via the list.
- Count matches the rendered visited set and the dataset total.
- Map at 320 px wide has no horizontal page scroll; legend remains readable.
- Visited/unvisited/border colors match the tokens and contrast test.
- Dataset script is deterministic: re-running it produces no diff.

**Not in this phase:** notes/dates (out of scope per D2), statistics by region,
shared maps, export,
landing page.

**Risks:** geometry size/performance; licence/attribution; disputed territories
(Palestine, Western Sahara, Taiwan, Kosovo) need a consistent, documented list
rather than ad-hoc curation.

---

## Phase 4 — Shared maps

**Status:** implemented and verified 2026-10-26; awaiting approval. The three
shared-map tables already existed from the Phase 2 migration, so this phase did
not add a migration. The implementation returns member display names and
deduplicated country-code sets so the member filter works; raw visit rows,
emails, user ids, notes, and visit dates are still never sent.

**Goal:** travel together, privately.

**Scope**

- Use the existing `shared_maps`, `shared_map_members`, and
  `shared_map_invitations` tables (no new migration required).
- Create/rename/delete map; owner membership in one transaction.
- Invite by email; token generation, SHA-256 hash at rest, expiry, revocation;
  Brevo invitation email; copyable link.
- Accept flow with email match, atomic single-use stamping, clear error states.
- Map list, map detail with combined SVG view, member filter, per-member counts.
- Owner: revoke invite, remove member. Member: leave map.
- Authorization helper + negative tests for every action (non-member, non-owner,
  expired/revoked/used invite, wrong email).
- Aggregation query returns deduplicated country codes/counts plus member display
  names and membership ids required by the filter; no emails, user ids, raw
  visits, notes, or dates.

**Acceptance criteria**

- Two accounts can share a map; both see the combined view and correct counts.
- A forwarded invite cannot be redeemed by a different email.
- An expired, revoked, or already-accepted invite is rejected with a generic
  message.
- A non-member requesting a map id gets a 404-style response.
- Removing a member updates the combined view immediately.
- Owner-only actions fail for members and non-members (tests).
- Invitation emails contain a working link and no other PII.
- No raw member visit rows reach the client (verified in a test/inspection).

**Not in this phase:** editor/viewer roles, public links, real-time updates,
comments, shared notes.

**Risks:** token leakage via referrers/logs; race conditions on acceptance;
confusion about what "combined" means (copy must be explicit).

---

## Phase 5 — Insights and filters

**Goal:** make the map informative without turning it into a social network.

**Scope**

- Country list filters/sorts: visited, region, name; search stays.
- Statistics: total, percentage, by region/continent (dataset must carry a
  region field).
- Shared-map comparison if privacy allows: "everyone", "only you", "nobody yet".
- Tests for filters, counts, and shared aggregates.

**Acceptance criteria**

- Filters/sorts are keyboard accessible and do not lose state unexpectedly.
- Region counts sum to the total visited.
- Shared comparison exposes only country codes and counts.
- Empty and large lists remain usable on mobile.

**Not in this phase:** notes, visit dates, visit history, photos, trip journals,
itineraries, charts requiring a charting library (prefer small CSS/SVG bars).

**D2 resolved (2026-10-26):** notes and visit dates are out of scope. Repeat
visits would require a separate visit-history model if ever added.

---

## Phase 6 — Image export

**Goal:** a map worth sharing.

**Scope**

- Pure export SVG component fed by an explicit minimal input (visit set, count,
  optional display name, year).
- Serialize → canvas at 2×–3×; PNG blob; Web Share with files; download
  fallback; SVG fallback on canvas failure.
- Export UI with size/aspect choice if cheap; progress and error states.
- Verify no shared-map data or account metadata can enter the component (types
  + tests).
- Cross-browser manual checks (iOS Safari, Android Chrome, desktop).

**Acceptance criteria**

- PNG is crisp at phone share resolution; text is legible; no clipped paths.
- Export of a user in a shared map contains only their own visits (test with
  fixture data).
- Share sheet appears where supported; download works elsewhere.
- No external fonts/images; canvas is not tainted (no SecurityError).
- Export works with 0 and with all countries visited.

**Not in this phase:** PDF, animated export, server-side rendering, custom
themes.

**Risks:** Safari canvas limits at very high resolution; font differences across
platforms. Mitigation: cap pixel dimensions, use system stacks, test early.

---

## Phase 7 — Public site and PWA

**Goal:** explain the product and make it installable, without weakening privacy.

**Scope**

- Landing page with real product visuals (from the export renderer where
  possible), clear CTA, honest copy.
- Privacy page describing actual data handling; "about the map" attribution.
- Signed-in redirect from `/` to the app (or a signed-in-aware header).
- Metadata + Open Graph image; favicon set.
- `manifest.webmanifest`, icons, theme color, standalone display.
- Service worker: app shell + static assets only; offline page; update flow;
  explicit denylist for authenticated HTML/API; cache cleared on sign-out where
  practical.
- Lighthouse/axe pass; manual offline test.

**Acceptance criteria**

- Landing page is responsive and accessible; CTA leads to sign-up.
- A signed-in user does not see the marketing page as their home.
- App is installable on Android Chrome and iOS Safari (manual).
- Offline navigation shows the offline page; no private data is served from
  cache after sign-out.
- Service worker never caches `/api/*` or authenticated documents (verified in
  DevTools and by inspecting the SW).
- Metadata renders correctly in a link preview.

**Not in this phase:** blog, docs site, i18n, dark mode, push notifications.

**Risks:** service worker caching private pages is the main security risk;
review the fetch handler line by line and test sign-out → offline.

---

## Phase 8 — Hardening, QA and deployment

**Goal:** a production deployment that is safe to invite real people to.

**Scope**

- Deploy to Vercel; Neon production branch; env vars; `migrate deploy` release
  step; custom domain and HTTPS.
- Brevo domain authentication (SPF/DKIM), production sender.
- Security headers + CSP (report-only → enforce), HSTS.
- Full accessibility audit (axe + manual keyboard/screen-reader pass).
- Cross-browser and device pass; performance check on the map route.
- End-to-end smoke test of the critical paths (sign up → mark → share → export).
- Error monitoring decision and setup (privacy-reviewed) or explicit deferral.
- Backups/PITR confirmed; rollback procedure documented.
- Final docs: deployment, runbook, known issues, changelog, release notes.

**Acceptance criteria**

- Production URL works over HTTPS; auth callbacks and emails use the real origin.
- Critical paths pass on production with two real accounts.
- CSP enforced with no console violations on core pages.
- No secrets in the client bundle (spot-check the build output).
- `npm audit` reviewed; unresolved issues documented.
- Rollback and restore steps are written and plausible.
- All docs match reality; `PROGRESS.md` marks the release.

**Not in this phase:** new features. Bugs found here are fixed; scope creep is
deferred.

---

## Definition of done (every phase)

1. Feature works in production mode, not just dev.
2. Authorization tested negatively, not only positively.
3. Accessibility: keyboard path exists; focus visible; contrast holds.
4. Mobile layout checked at 320 px and 390 px.
5. No secrets/PII in logs, bundles, or git.
6. `npm run check` and `npm run build` pass; results recorded with dates.
7. Docs updated (`PROGRESS.md` first, then affected docs).
8. A short report explains what changed, what was verified, what was not, and
   what decision is needed next.
9. Work stops for approval.
