# AtlasShare

**Your world, mapped together.**

Track the countries you have visited on your own world map, then create shared
maps with your family and friends.

> **Project status: Phases 1–7 are complete and Phase 8 (hardening and
> deployment) is in progress; email verification by code is its first finished
> item.**
> You can create an account (confirming your email with a 6-digit code), sign
> in/out, reset a password, manage account
> settings, mark visited countries on a private 195-country world map, search
> that list, see continent-level statistics, combine your map with invited
> members in a private read-only shared view with a country-level comparison,
> and preview/export a high-resolution image of your personal map or the
> combined shared map. The public landing, privacy, and install pages, the web
> manifest, and an offline-shell service worker exist; the manual device,
> offline, and Lighthouse checks are still outstanding. See
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
- **Neon PostgreSQL** in production / local PostgreSQL 18 in development
- **Prisma 7** with a host-selected Neon or `pg` driver adapter
- **Better Auth** with email/password and database sessions
- **Brevo** for transactional email (disabled automatically without a key)
- **Vitest** + React Testing Library; Playwright planned for Phase 8
- **Map data:** `@svg-maps/world` 2.0.0 (CC-BY-4.0), filtered to the 195
  recognized countries; generated locally, no runtime map library
- **Image export:** inline SVG → canvas PNG at 2× (3200 × 2000), Web Share with
  files, download fallback, and an SVG fallback when canvas is unavailable
- Hosting: Vercel (planned, Phase 8)

## Getting started

Requirements: Node 24 (`.nvmrc`), npm, and PostgreSQL (local or Neon).

```bash
npm install
cp .env.example .env   # fill in real values
npm run db:deploy      # apply committed migrations (or db:migrate in development)
npm run dev
```

Open http://localhost:3000. `postinstall` generates the Prisma client.

If port 3000 is already taken, Next.js starts on the next free port. Set
`NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` in `.env` to that exact origin
(for example `http://localhost:3001`) and restart `npm run dev`; otherwise
sign-up and sign-in fail with an **"Invalid origin"** error because Better Auth
only trusts the configured origin.

Local development can use plain Postgres; the runtime adapter switches to Neon
when the database host ends in `.neon.tech`. Start a local server, create the
databases, and point `DATABASE_URL`/`DIRECT_URL` at them. For a fresh local
database:

```bash
createdb atlasshare_dev
createdb atlasshare_test
npm run db:migrate
```

Email is optional in development. Without `BREVO_API_KEY`, welcome, reset, and
invitation messages are skipped with a log line (read the reset token from the
`verification` table in development, and copy the invitation link from the owner
UI). **Sign-up needs an emailed 6-digit code**: when mail cannot be sent in
development (no key, or Brevo rejects the request), the code is printed in the
terminal running `npm run dev` as
`[email] (development only) verification code for <email>: 123456`, so you can
finish creating the account. Production never prints codes. To send real mail,
create a free Brevo account, add and verify a
sender address (no domain purchase required), then set `BREVO_API_KEY` and point
`EMAIL_FROM` at that verified address. If Brevo returns `401 unauthorized` with
an “unrecognised IP address” message, authorize the current IP in Brevo’s
**Authorised IPs** settings, then retry. Never commit `.env`.

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
| `npm run data:countries` | Regenerate the committed country metadata and map geometry. |
| `npm run db:migrate` | Create/apply a dev migration. |
| `npm run db:deploy` | Apply committed migrations (release/CI). |
| `npm run db:generate` | Regenerate the Prisma client. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run db:auth-schema` | Regenerate Better Auth's schema fragment (review the diff). |

`next typegen` must run before `tsc` because Next 16 generates route types
(`LayoutProps<"/">`) into `.next/types`.

## Project structure

```
src/
  app/            App Router routes, metadata, auth/account/map/shared/invite
  components/     auth, account, map, export, shared, and UI primitives
  config/         brand identity and lazy environment validation
  data/           generated country metadata + canonical helpers
  lib/            browser auth client, export helpers, safe redirects
  server/         auth, database, authorization, shared maps, actions, email
  test/           test setup
docs/             specification, architecture, database, security, plan, etc.
prisma/           schema and committed migrations
public/map/       generated public SVG geometry (no user data)
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
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, migrations, and invariants.
- [`docs/SECURITY.md`](docs/SECURITY.md) — auth, authorization, privacy rules.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — decision records (ADRs).
- [`docs/TESTING.md`](docs/TESTING.md) — strategy and honest test results.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — planned Vercel/Neon/Brevo setup.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — notable changes.

## Design

The palette is warm paper, moss, and dusty rose:

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#E9E3DD` | Page background |
| `surface` | `#F4EFEA` | Cards |
| `ink` | `#2B302C` | Primary text |
| `moss` | `#5A6655` | Borders, accents |
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

No license has been chosen for the AtlasShare code yet. Treat the code as all
rights reserved until one is added.

The generated map geometry includes CC-BY-4.0 data from
[`@svg-maps/world`](https://www.npmjs.com/package/@svg-maps/world), filtered to
the 195 recognized countries. Attribution and license links are shown in the
map's “About the map data” disclosure. The full notice is in
[`public/map/NOTICE.txt`](public/map/NOTICE.txt) and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
