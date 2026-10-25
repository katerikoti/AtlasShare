# AtlasShare — Development Plan

Status: **Phase 1 complete, awaiting approval.** Later phases are scoped but not
started.

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
| 5 | Travel details & insights | Notes/dates, filters, stats | FR-T1…T4, D2 |
| 6 | Image export | Shareable PNG of your map | FR-E1…E5 |
| 7 | Public site & PWA | Landing, privacy, installable app | FR-P1…P5, FR-W1…W4 |
| 8 | Hardening, QA & deployment | Production launch readiness | NFR-1…8, §10 |

---

## Phase 1 — Foundation and planning ✅ (awaiting approval)

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

## Phase 2 — Accounts and authentication

**Goal:** a real account system backed by Neon/Postgres, with a usable settings
page and working transactional email.

**Scope**

- Provision Neon (branches for dev/preview/prod), Prisma 7 + `@prisma/adapter-neon`,
  `prisma.config.ts`, first migration.
- Better Auth: email/password, database sessions, Prisma adapter, `/api/auth/[...all]`,
  `proxy.ts` for optimistic redirects (not authorization).
- Env validation module; fail fast on missing config.
- Sign-up, sign-in, sign-out, password reset, welcome email via Resend.
- Account settings: display name, change password, delete account.
- Rate limiting baseline; generic auth errors; session cookie hardening.
- Route groups `(auth)` and `(app)`; a minimal signed-in shell.
- Integration tests against `TEST_DATABASE_URL`; unit tests for validation.

**Acceptance criteria**

- A new user can sign up, receive a welcome email, sign out, sign in, reset a
  password, change their name, and delete their account.
- Deleting an account removes its sessions and private rows (cascade verified).
- Password reset token is single-use and expires; the response does not reveal
  whether an email exists.
- Session cookie is HttpOnly, SameSite=Lax, Secure in production.
- Server actions reject unauthenticated calls; tests prove it.
- Migration applies cleanly from an empty database; `migrate deploy` is
  documented.
- Emails render correctly in a real client (manual check) and sending failures
  do not block account creation.
- `npm run check`, `npm run build`, and the DB smoke test pass; results recorded.

**Not in this phase:** any map or country data; OAuth; MFA; email verification
enforcement; public pages.

**Risks:** Better Auth's generated schema differs from the plan; Resend domain
not verified; Neon connection pooling misconfiguration. Mitigation: verify the
generated schema before writing app models; test with Resend's sandbox sender.

---

## Phase 3 — Country dataset and personal map

**Goal:** the core product moment — mark countries and see your map.

**Scope**

- Resolve D1 (195 vs 250) and generate the country dataset + SVG paths with a
  reproducible script; validate codes, names, and path coverage; commit outputs.
- Dataset integrity tests: unique codes, valid alpha-2, no missing names, path
  count matches the dataset.
- `visited_countries` table + migration; idempotent toggle Server Action with
  server-side authorization and validation.
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

**Not in this phase:** notes/dates, statistics by region, shared maps, export,
landing page.

**Risks:** geometry size/performance; licence/attribution; disputed territories
(Palestine, Western Sahara, Taiwan, Kosovo) need a consistent, documented list
rather than ad-hoc curation.

---

## Phase 4 — Shared maps

**Goal:** travel together, privately.

**Scope**

- `shared_maps`, `shared_map_members`, `shared_map_invitations` tables +
  migration.
- Create/rename/delete map; owner membership in one transaction.
- Invite by email; token generation, SHA-256 hash at rest, expiry, revocation;
  Resend invitation email; copyable link.
- Accept flow with email match, atomic single-use stamping, clear error states.
- Map list, map detail with combined SVG view, member filter, per-member counts.
- Owner: revoke invite, remove member. Member: leave map.
- Authorization helper + negative tests for every action (non-member, non-owner,
  expired/revoked/used invite, wrong email).
- Aggregation query returns country → member ids only; no notes/dates leak.

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

## Phase 5 — Travel details and insights

**Goal:** make the map feel personal and informative without turning it into a
social network.

**Scope**

- Optional `firstVisitedAt` and private `note` per visit (schema already
  reserved); edit UI with validation.
- Country list filters/sorts: visited, region, name; search stays.
- Statistics: total, percentage, by region/continent (dataset must carry a
  region field).
- Shared-map comparison if privacy allows: "everyone", "only you", "nobody yet".
- Tests for date/note validation and for notes never appearing in shared
  aggregates.

**Acceptance criteria**

- Notes/dates persist and are visible only to their owner.
- Filters/sorts are keyboard accessible and do not lose state unexpectedly.
- Region counts sum to the total visited.
- Shared comparison never exposes notes or dates.
- Empty and large lists remain usable on mobile.

**Not in this phase:** photos, trip journals, itineraries, charts requiring a
charting library (prefer small CSS/SVG bars).

**Decision needed:** D2 — whether dates/notes ship in Phase 3 or here. Keeping
them here makes Phase 3 smaller and the core loop faster to validate.

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
- Resend domain verification (SPF/DKIM), production sender.
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
