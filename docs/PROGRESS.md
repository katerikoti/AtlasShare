# AtlasShare — Progress

**Current phase:** Phase 1 — Foundation and planning.
**Status:** complete, **awaiting user approval**. Phase 2 has not started.
**Last updated:** 2026-10-25.

This is the first file to read when resuming work. It reflects what is actually
built, not what is planned. Plans live in `DEVELOPMENT_PLAN.md`.

## 1. Phase status

| Phase | Status | Notes |
| --- | --- | --- |
| 1. Foundation & planning | ✅ Complete (pending approval) | Runnable branded skeleton + full docs. |
| 2. Accounts & authentication | ⛔ Not started | Needs approval + Neon/Resend access. |
| 3. Country dataset & personal map | ⛔ Not started | Blocked on country-set decision (D1). |
| 4. Shared maps | ⛔ Not started | — |
| 5. Travel details & insights | ⛔ Not started | D2 decides whether notes/dates move earlier. |
| 6. Image export | ⛔ Not started | — |
| 7. Public site & PWA | ⛔ Not started | — |
| 8. Hardening, QA & deployment | ⛔ Not started | — |

## 2. What exists today

### Application

- Next.js 16.4.3 App Router app, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3,
  Turbopack.
- Brand identity in `src/config/brand.ts`; design tokens in
  `src/app/globals.css`.
- Root layout with metadata (title template, description, Open Graph, Twitter,
  theme color, `lang="en"`).
- Temporary branded placeholder at `/` (explicitly not the landing page) and a
  branded 404 page.
- Accessible focus styles, reduced-motion handling, responsive layout verified
  at 320/390/1280 px.

### Tooling

- ESLint 9 (`eslint-config-next`), TypeScript strict, Vitest 5 + RTL + jsdom +
  jest-dom.
- Scripts: `dev`, `build`, `start`, `lint`, `typegen`, `typecheck`, `test`,
  `test:watch`, `check`.
- `.nvmrc` (Node 24), `.env.example`, `.gitignore` that excludes `.env*` but
  keeps `.env.example`.
- `AGENTS.md` with project rules (including the Next.js-managed block).

### Documentation

`README.md`, `docs/PROJECT_SPECIFICATION.md`, `ARCHITECTURE.md`, `DATABASE.md`,
`SECURITY.md`, `DEVELOPMENT_PLAN.md`, `DECISIONS.md`, `TESTING.md`,
`DEPLOYMENT.md`, `CHANGELOG.md`, this file.

### Not built (do not assume otherwise)

No authentication, no database, no Prisma schema, no map, no country dataset,
no shared maps, no export, no landing page, no PWA, no deployment, no CI.

## 3. Verification (2026-10-25)

Environment: macOS, Node v24.13.1, npm 11.8.0, Chrome 148 headless.

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | ✅ exit 0 |
| Types | `npm run typecheck` | ✅ exit 0 |
| Unit tests | `npm test` | ✅ 4/4 passed (1 file, ~435 ms) |
| Production build | `npm run build` | ✅ exit 0; `/` and `/_not-found` static |
| Production smoke | `PORT=3101 npm start` + HTTP | ✅ 200; correct title/lang/h1; 404 page works |
| Console/network | Chrome CDP | ✅ no log entries, no failed requests |
| Layout | CDP metrics at 1280/390/320 | ✅ no horizontal overflow at any width |
| Colors/fonts | CDP computed styles | ✅ canvas `#E9E3DD`, ink `#2B302C`, serif h1, sans body |
| Focus | CDP | ✅ 2 px visible outline |
| Clean clone | `git clone` → `npm ci` → `check` → `build` | ✅ all pass; no untracked files required |

Not run: e2e, axe, cross-browser, DB integration, email delivery, Lighthouse.
See `TESTING.md` §4.7 for reasons.

## 4. Decisions made in Phase 1

Full records in `DECISIONS.md`.

- Next.js 16 App Router + Turbopack; Server Components by default.
- Tailwind 4 CSS-first tokens; contrast unit-tested.
- Cache Components disabled; authenticated app is request-time.
- Better Auth (not Auth.js v5 beta), database sessions.
- Prisma 7 + `@prisma/adapter-neon`, ESM, `prisma.config.ts`, pooled/direct URLs.
- Resend, plain HTML email templates.
- Custom React SVG map, no runtime geo library.
- Static generated country dataset; no `Country` table.
- ISO alpha-2 codes; Kosovo = `XK`.
- Client-side SVG → canvas PNG export; Web Share + download fallback.
- Hashed, single-use, per-email invitation tokens.
- Two roles: `OWNER`, `MEMBER`.
- Vitest + RTL now; Playwright deferred to Phase 8.
- `proxy.ts` for optimistic redirects only.

## 5. Open decisions (need user input)

### D1 — Country set (blocking Phase 3)

- **Option A:** 195 sovereign states. Territories folded into the sovereign
  state.
- **Option B (recommended):** 249 ISO 3166-1 entries + Kosovo = **250 countries
  & territories**, labelled consistently, territories counted separately.
- Why it matters: dataset, counts, export copy, tests, and user expectations all
  depend on it. Changing later needs a data migration and copy changes.
- Recommendation rationale: people visit Hong Kong, Greenland, Puerto Rico, and
  Réunion; being unable to mark them feels broken. "Countries & territories" is
  honest labelling.

### D2 — Notes/dates timing

- **Recommendation:** keep Phase 3 to visited-state only; add notes/dates and
  insights in Phase 5. Smaller core loop, faster validation.

## 6. Blockers and external dependencies

| Item | Status | Needed for |
| --- | --- | --- |
| User approval of Phase 1 | pending | Phase 2 start |
| Neon project + connection strings | not provisioned | Phase 2 |
| Resend account + verified domain | not provisioned | Phase 2 email |
| Country-set decision (D1) | open | Phase 3 |
| Domain name (optional) | undecided | Phase 8 |

No credentials are committed. `.env.example` documents the expected variables.

## 7. Repository state

- Local git repository on `main`, with the Phase 1 initial commit as the root
  commit (see `git log`).
- Remote `origin` = `https://github.com/katerikoti/AtlasShare.git` (empty when
  inspected). **Not pushed** — pushing needs user approval.
- `gh` CLI is not installed; git credentials are cached.
- `package-lock.json` is committed; `node_modules`, `.next`, `.env*`, and
  `tsbuildinfo` are ignored.

## 8. Next steps (after approval)

1. Confirm D1 (country set) and D2 (notes timing).
2. Provision Neon; record branch strategy and retention.
3. Generate Better Auth's schema with the installed version; compare to
   `DATABASE.md`; write the first migration.
4. Implement auth + settings + welcome/reset email (Phase 2 scope).
5. Add integration tests against `TEST_DATABASE_URL`; record skipped vs. passed.
6. Stop for approval before Phase 3.

## 9. Known limitations and debt

- Placeholder page will be replaced by the real landing page in Phase 7.
- No CI yet; checks are run locally.
- No automatic dependency updates; `npm audit` is manual until CI exists.
- Split-host development is not set up (only localhost).
- The `next-env.d.ts` and `.next/types` are generated; `typecheck` depends on
  `next typegen`.
- Visual review of the placeholder is delegated to the user because the agent
  cannot view images; layout is verified by measurements instead.

## 10. Resuming in a fresh session

1. Read this file, then `DEVELOPMENT_PLAN.md`, then `AGENTS.md`.
2. `npm ci` (or `npm install` if the lockfile changed) and `npm run check`.
3. Check the "Open decisions" and "Blockers" sections above.
4. Do not start a later phase without explicit approval.
5. At the end of any work: update this file, run `npm run check` and
   `npm run build`, report honestly, and stop.
