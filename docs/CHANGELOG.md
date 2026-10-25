# Changelog

Notable changes, newest first. This project follows a phase-based plan; see
`DEVELOPMENT_PLAN.md`. Version numbers are not yet meaningful for the product
(no release), but the package version is tracked.

## [Unreleased]

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
