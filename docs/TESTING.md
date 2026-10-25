# AtlasShare — Testing

Status: **Phase 1.** Four unit tests exist. Everything else is a plan with
explicit status. Results below are from the Phase 1 verification run on
2026-10-25 (local machine, Node 24.13.1, npm 11.8.0).

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
| Unit | Vitest 5 | Every check | ✅ 4 tests |
| Component | Vitest + React Testing Library + jsdom | Every check | ✅ configured (no component tests yet) |
| Data integrity | Vitest over the country dataset | Phase 3 | ⬜ planned |
| Integration (DB) | Vitest against `TEST_DATABASE_URL` | When a test DB is configured | ⬜ planned |
| End-to-end | Playwright (Phase 8) | CI / pre-release | ⬜ planned |
| Accessibility | axe + manual keyboard/screen-reader | Each UI phase; full audit Phase 8 | ⬜ manual partial |
| Visual/layout | Headless Chrome metrics + manual screenshots | Each UI phase | ✅ Phase 1 metrics |

## 3. Commands

```bash
npm run lint        # ESLint
npm run typecheck   # next typegen && tsc --noEmit
npm test            # Vitest, single run
npm run test:watch  # Vitest, watch mode
npm run check       # lint + typecheck + test
npm run build       # production build
npm start           # serve the production build (after build)
```

`next typegen` must run before `tsc` because Next 16 generates route types
(`LayoutProps<"/">`) into `.next/types`. Running `tsc` alone on a clean checkout
fails.

## 4. Phase 1 results

### 4.1 `npm run lint`

- Command: `npm run lint`
- Result: **passed**, exit 0, no warnings or errors.

### 4.2 `npm run typecheck`

- Command: `npm run typecheck` (`next typegen && tsc --noEmit`)
- Result: **passed**, exit 0. Type generation succeeded; no type errors.

### 4.3 `npm test`

- Command: `npm test`
- Result: **passed**, 4/4 tests in 1 file (`src/config/brand.test.ts`),
  ~435 ms.
- What is covered:
  - the product name is centralized and non-empty,
  - body text contrast ≥ 4.5:1 on canvas, surface, and rose,
  - muted text contrast ≥ 4.5:1 on canvas,
  - map border (moss) contrast ≥ 3:1 against the map base.
- What is **not** covered yet: any component, any server logic, any database.

### 4.4 `npm run build`

- Command: `npm run build`
- Result: **passed**, exit 0. Turbopack compiled successfully; TypeScript
  finished; 3/3 static pages generated.
- Output routes: `/` and `/_not-found`, both static (`○`).

### 4.5 Production smoke test

Served with `PORT=3101 npm start` against the production build.

| Check | Result |
| --- | --- |
| `GET /` | **200** |
| Document title | `AtlasShare — Your world, mapped together.` |
| `<html lang>` | `en` |
| Exactly one `<h1>` | yes |
| Landmarks | one `main`, one `header`, one `footer` |
| Body background | `rgb(233, 227, 221)` = `#E9E3DD` |
| Body text | `rgb(43, 48, 44)` = `#2B302C` |
| Display font on h1 | serif stack (Georgia fallback) |
| Visible focus outline | 2 px |
| `GET /does-not-exist` | **404**, branded not-found page |
| Console entries (Chrome CDP `Log`) | **none** |
| Failed network requests | **none** |

### 4.6 Layout checks (headless Chrome, CDP `Emulation.setDeviceMetricsOverride`)

| Viewport | Document scroll width | Horizontal overflow | h1 size | Map SVG |
| --- | --- | --- | --- | --- |
| 1280 × 900 | 1280 | **no** | 72 px | 474 × 316 |
| 390 × 844 | 390 | **no** | 48 px | 309 × 206 |
| 320 × 700 | 320 | **no** | 48 px | 239 × 159 |

These are measurements, not a subjective design review. Screenshots were
captured during Phase 1, but the agent could not visually inspect images
(the model does not accept image input). Visual judgment of the placeholder is
therefore left to the user; the layout metrics above are the objective checks.

### 4.7 Not run in Phase 1

| Check | Status | Why |
| --- | --- | --- |
| Real-browser interaction (clicks, forms) | not run | No interactive features yet. |
| Playwright e2e | not run | Not installed; Phase 8. |
| Accessibility audit with axe | not run | Not installed; no feature UI yet. |
| Database/integration tests | blocked | No database provisioned. |
| Email delivery | blocked | No Resend key or verified domain. |
| Auth flows | not implemented | Phase 2. |
| Lighthouse performance | not run | Placeholder only; meaningful after the map exists. |
| Cross-browser (Safari/Firefox) | not run | Only Chrome 148 headless used. |

## 5. Test data and fixtures

- No database and no fixtures yet.
- When integration tests arrive, they use `TEST_DATABASE_URL`, create data with
  unique emails per run, and clean up in `afterEach`/transactions.
- Country fixtures use real ISO codes from the committed dataset; tests must
  fail if a fixture code is not in the dataset.

## 6. Accessibility testing plan

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

## 7. Manual QA checklist (feature phases)

- [ ] Happy path on desktop and phone.
- [ ] Empty state, loading state, error state.
- [ ] Refresh mid-flow: state is consistent (no phantom optimistic UI).
- [ ] Two accounts: isolation holds.
- [ ] Non-member/non-owner attempts fail with a non-revealing error.
- [ ] Back/forward navigation does not leak stale private data.
- [ ] Sign out, then sign in as another user: no cached personal data.
- [ ] Long text (80/280 chars) does not break layout.
- [ ] Offline (after PWA exists): branded offline page, no private cache.

## 8. CI (planned)

When the repo gets CI (Phase 2 or 8):

```bash
npm ci
npm run check
npm run build
```

Integration tests run only when `TEST_DATABASE_URL` is configured; otherwise
they are skipped and the run is reported as such. The build must not need
secrets: database access at build time is avoided by dynamic rendering.

## 9. Known gaps

- No browser-level regression tests yet.
- No test for the proxy/redirect behavior (none exists yet).
- No automated check that client bundles contain no secrets. Planned for Phase
  8 (grep the build output for known secret patterns).
- No load testing. At this scale, not justified.
