# AtlasShare

**Your world, mapped together.**

Mark the countries you have visited on a personal world map, then combine your
map with the people you travel with.

> **Project status: Phase 1 of 8 — foundation only.**
> The repository runs, but there is no sign-up, no map, no sharing, and no
> export yet. The current page is a temporary placeholder. See
> [`docs/PROGRESS.md`](docs/PROGRESS.md) for exactly what exists and
> [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) for what comes next.

## Why

Travel history usually lives in scattered notes and memory. Most map tools are
either social networks that want everything, or image generators that cannot
represent a group. AtlasShare keeps a private country-level map and lets you
opt into a shared view with specific people — nothing public, no location
tracking, no feed.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4** with CSS-first design tokens
- **Neon PostgreSQL** + **Prisma 7** (`@prisma/adapter-neon`)
- **Better Auth** (planned, Phase 2)
- **Resend** for transactional email (planned, Phase 2)
- **Vitest** + React Testing Library; Playwright planned for Phase 8
- Hosting: Vercel (planned, Phase 8)

## Getting started

Requirements: Node 24 (`.nvmrc`) and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The app currently needs no environment variables. When Phase 2 lands, copy
`.env.example` to `.env` and fill in the Neon/Resend values. Never commit `.env`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | Generate Next route types, then `tsc --noEmit`. |
| `npm test` | Run unit tests once. |
| `npm run test:watch` | Unit tests in watch mode. |
| `npm run check` | Lint + typecheck + tests. Run before every commit. |

`next typegen` must run before `tsc` because Next 16 generates route types
(`LayoutProps<"/">`) into `.next/types`.

## Project structure

```
src/
  app/            App Router routes, layout, global CSS
  components/     (planned) map, export, UI primitives
  config/         brand identity — the source of truth for the product name
  data/           (planned) generated country dataset
  server/         (planned) auth, database, authorization, actions, email
  lib/            framework-agnostic helpers
  test/           test setup
docs/             specification, architecture, database, security, plan, etc.
prisma/           (planned) schema and migrations
```

## Documentation

Start here:

- [`docs/PROGRESS.md`](docs/PROGRESS.md) — current phase, what works, blockers.
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — phase scope and
  acceptance criteria.
- [`docs/PROJECT_SPECIFICATION.md`](docs/PROJECT_SPECIFICATION.md) — product
  requirements.

Reference:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, runtime model, map and
  export design.
- [`docs/DATABASE.md`](docs/DATABASE.md) — planned schema and invariants.
- [`docs/SECURITY.md`](docs/SECURITY.md) — auth, authorization, privacy rules.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — decision records (ADRs).
- [`docs/TESTING.md`](docs/TESTING.md) — strategy and honest test results.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — planned Vercel/Neon/Resend setup.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — notable changes.

## Design

The palette is warm paper, moss, and dusty rose:

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#E9E3DD` | Page background |
| `surface` | `#F4EFEA` | Cards |
| `ink` | `#2B302C` | Primary text |
| `moss` | `#667361` | Borders, accents |
| `rose` | `#DCA1A1` | Visited countries |
| `map` | `#F1ECE6` | Map base / unvisited |

Map colors: visited = dusty rose, unvisited = warm off-white, borders = moss.
Contrast for text and map borders is unit-tested.

The product name and palette mirror live in `src/config/brand.ts`. Do not
hard-code the name in components.

## Contributing

This is a phased solo build. Before changing code:

1. Read `AGENTS.md`, `docs/PROGRESS.md`, and the current phase in
   `docs/DEVELOPMENT_PLAN.md`.
2. Work only inside the approved phase.
3. Run `npm run check` and `npm run build`.
4. Update `docs/PROGRESS.md` and any affected docs.
5. Do not commit secrets, `.env` files, or invitation tokens.

## License

No license has been chosen yet. Treat the code as all rights reserved until one
is added.
