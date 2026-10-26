# AtlasShare — Architecture

Status: **Phase 2 (accounts and authentication) is implemented.** Map, shared
maps, export, and PWA functionality are still planned. Anything marked _planned_
does not exist in the codebase yet. See [`PROGRESS.md`](./PROGRESS.md) for what is
actually built.

## 1. Purpose of this document

This is the technical map of AtlasShare: the stack, the runtime model, the
module boundaries, and the constraints that later phases must respect. If a
future change contradicts this document, either the change is wrong or this
document needs an explicit update (and, for significant choices, an ADR in
[`DECISIONS.md`](./DECISIONS.md)).

## 2. Stack

Versions are the ones installed at the end of Phase 2. Pin exact versions for
anything that affects the database, auth, or build output.

| Layer | Choice | Version | Notes |
| --- | --- | --- | --- |
| Runtime | Node.js | 24 (`.nvmrc`) | Vercel Node 24 runtime. |
| Framework | Next.js (App Router) | 16.4.3 | Turbopack for dev and build. |
| UI | React | 19.3.0 | Server Components by default. |
| Language | TypeScript | 5.9.3 | `strict: true`. |
| Styling | Tailwind CSS | 4.3.3 | CSS-first config via `@theme` in `globals.css`. |
| Linting | ESLint | 9 | `eslint-config-next`. |
| Unit tests | Vitest + React Testing Library | 5.0.5 / 16.3.3 | jsdom, `jest-dom` matchers. |
| Database | Neon PostgreSQL (prod) / PostgreSQL 18 (local) | — | Adapter selected by host. |
| ORM | Prisma | 7.10.1 | ESM, `prisma.config.ts`, Neon or `pg` driver adapter. |
| Auth | Better Auth | 1.7.12 | Prisma adapter, database sessions. |
| Email | Brevo (transactional HTTP API) | — | Best-effort; no-op without an API key. Plain HTML templates, no SDK. |
| Hosting | Vercel | — | Planned for Phase 8. |

## 3. Product identity

The name, tagline, description, palette, and repository URL live in
`src/config/brand.ts`. On-screen colors are defined once as CSS custom
properties in `src/app/globals.css` (`@theme`). `brand.ts` mirrors those values
for contexts where CSS is unavailable (PNG export, email HTML).

Rule: never write the product name as a literal in UI code. Use `brand.name`.
When renaming the product, update `brand.ts`, `package.json`, the `A` mark, and
verify the metadata in `src/app/layout.tsx`.

## 4. System context

```
                    ┌──────────────────────────────┐
                    │  Browser (React 19, PWA)      │
                    │  - SVG map interaction        │
                    │  - optimistic UI              │
                    │  - PNG export (canvas)        │
                    └──────────────┬───────────────┘
                                   │ HTTPS
                    ┌──────────────▼───────────────┐
                    │  Next.js 16 on Vercel         │
                    │  - RSC pages & layouts        │
                    │  - Server Actions (mutations) │
                    │  - /api/auth/[...all]         │
                    │  - proxy.ts (optimistic auth) │
                    └───┬───────────┬───────────┬───┘
                        │           │           │
             ┌──────────▼──┐  ┌─────▼─────┐  ┌──▼──────────┐
             │ Neon        │  │ Brevo    │  │ Static      │
             │ Postgres    │  │ (email)   │  │ country SVG │
             │ (Prisma 7)  │  │           │  │ in repo     │
             └─────────────┘  └───────────┘  └─────────────┘
```

No other third-party services are planned. Specifically: no analytics, no
advertising, no geolocation API, no map tile provider, and no external image or
font CDN. That keeps the privacy story simple and the export canvas untainted.

## 5. Runtime model (Next.js 16)

### 5.1 Server-first

- Pages and layouts are Server Components unless interactivity requires
  otherwise. Session reads, database queries, and authorization happen on the
  server only.
- Client Components are limited to: the map surface, the export controls, form
  widgets that need local state, and small progressive-enhancement helpers.
- Mutations use **Server Actions** so that validation, authorization, and the
  database write stay in one server-side function. Server Actions are reachable
  only through the app's own forms/requests; they still validate input and
  re-check authorization because a caller can forge a request.

### 5.2 Route protection

Next.js 16 renamed Middleware to **Proxy** (`proxy.ts`, one per project). The
proxy may perform **optimistic** checks only: is there a session cookie? Does
this look like a signed-in area? It must not be the authorization boundary.

The real check is always server-side, in the data layer:

```ts
const session = await requireSession();          // redirects to /sign-in when absent
// Phase 3: const map = await requireMapMembership(mapId, session.user.id);
```

Rationale: a proxy runs before the request is resolved and is not intended for
slow data fetching or full session management (see the Next.js Proxy docs).
Database-backed authorization cannot be safely done there.

The implemented proxy protects `/account` only. It deliberately does **not**
redirect signed-in users away from auth pages: Better Auth rotates the session
cookie on password change, and a cookie-presence redirect between `/account` and
`/sign-in` can race that rotation into a loop. A signed-in user seeing the
sign-in form is harmless.

### 5.3 Caching

Cache Components and Partial Prefetching are **disabled** (`next.config.ts`).
AtlasShare is an authenticated, request-time application; almost every screen
depends on the current user. The default is therefore dynamic rendering and no
`fetch` cache. Any future caching must be an explicit, reviewed decision with:

- a public, non-personal data boundary,
- `revalidate`/tags that are invalidated on writes,
- a test proving one user cannot see another user's data.

The country dataset and SVG geometry are static assets, so they can be cached
aggressively by the CDN — they contain no user data.

### 5.4 Server Actions vs. route handlers

- **Server Actions**: marking a country, renaming a map, creating an invitation,
  accepting an invitation, updating account settings.
- **Route handlers** (`route.ts`): only where an HTTP contract is required —
  Better Auth's `/api/auth/[...all]`, and later the PWA service worker and
  manifest if they cannot be static files.
- No separate REST API is built for the app's own UI. The UI and the server
  share TypeScript types directly.

## 6. Current and planned directory structure

```
src/
  app/
    layout.tsx              # root layout, metadata, fonts
    globals.css             # Tailwind v4 theme tokens (colors, radius, shadow)
    page.tsx                # temporary Phase 1/2 placeholder (landing is Phase 7)
    not-found.tsx
    icon.svg                # app icon
    (auth)/                 # sign in, sign up, forgot/reset password
    (app)/account/          # signed-in account settings
    api/auth/[...all]/      # Better Auth handler
  components/
    auth/                   # sign-in/up, forgot/reset, sign-out forms
    account/                # name, password, delete-account forms
    ui/form.tsx             # field, message, button/input styles
    (map/ and export/ are planned for Phases 3 and 6)
  config/
    brand.ts                # product identity (source of truth)
    env.ts                  # lazy Zod validation of server env
  data/
    countries.ts            # planned Phase 3: generated country dataset
    world.svg.ts            # planned Phase 3: generated path data
  lib/
    auth-client.ts          # browser Better Auth client
  server/
    auth.ts                 # lazy Better Auth instance + options
    db.ts                   # lazy Prisma client, adapter selected by host
    session.ts              # getSession + requireSession gate
    authorization.ts        # planned Phase 3: membership/permission helpers
    actions/                # account Server Actions (map actions planned)
    email/                  # Brevo wrapper, templates, welcome/reset senders
    validation/             # pure Zod schemas for account forms
  test/
    setup.ts                # Vitest setup (jest-dom)
prisma/
  schema.prisma             # auth + app models (Phase 2 migration)
  migrations/               # committed migrations
scripts/
  better-auth-schema.config.ts
public/                     # planned Phase 7: PWA icons, manifest
```

Rules:

- `src/lib` must stay framework-agnostic and pure so it is cheap to unit test.
  The browser auth client is the deliberate exception (it is a client-only
  integration module).
- `src/server` may import Node APIs and the database; it must never be imported
  by a Client Component.
- `src/data` is generated data plus its types; no hand edits to generated files.
- `src/generated/prisma` is generated by `postinstall` and gitignored.

## 7. Country dataset and map

### 7.1 Dataset

The country set is a **single committed dataset**, not a runtime dependency and
not a database table. It defines the canonical list of map units, their display
names, ISO codes, and SVG paths.

Candidate sources evaluated in Phase 1:

| Source | License | Shape | Problems |
| --- | --- | --- | --- |
| `@svg-maps/world` 2.0.0 | CC-BY-4.0 | 256 SVG paths, ISO alpha-2 ids | Missing Antarctica; includes `xk`, `ju`, `go`, and six `um-*` subdivisions; needs curation. |
| `world-countries` 5.1.0 | ODbL | 250 country records, GeoJSON per country | No geometry for `AQ` and `XK`; ODbL share-alike is awkward for app code. |
| Natural Earth 50m | Public domain | 242 features | Groups Palestine under Israel, misses small states; unacceptable without curation. |

Decision: **generate** our own dataset in Phase 3 from a public-domain source
(Natural Earth 1:50m as the geometry base, with hand-curated corrections), and
commit the generated artefacts plus a script that reproduces them. The dataset
must be reproducible and reviewable in a diff. Attribution for any CC-BY source
lives in an "About the map" section.

Decision (D1, 2026-10-26): the map shows **249 ISO 3166-1 entries plus Kosovo
(250 "countries & territories")**. This fixes the dataset, count text, and
export. Label the feature "countries & territories" everywhere. Palestine (`PS`)
and Israel (`IL`) are separate units; the generator must assert both paths exist
and never merge them.

Identifier rules:

- Store ISO 3166-1 alpha-2 codes, uppercase, as the primary key of a visit.
- The only documented exception is Kosovo, stored as `XK` (a user-assigned code
  used by the EU and widely by software; not an official ISO assignment).
- Never key data on display names or SVG path ids that differ from the codes.
- Validate every incoming code against the committed dataset on the server.
- **Palestine (`PS`) is a country and is always its own map unit.** It is never
  merged into Israel or any other path. Natural Earth's default grouping of
  Palestine under Israel is rejected; Phase 3 curation must split it into a
  separate, correctly labelled path. This applies to both country-set options.

### 7.2 Rendering

- A hand-built React SVG map, `viewBox="0 0 1000 500"`-style, no map library and
  no tile server.
- Each unit is a `<path>` with `data-country="SE"`, `role`/`aria-label` handled
  by a parallel accessible list rather than 250 focusable SVG nodes.
- Fills come from CSS classes driven by the design tokens: visited = dusty rose,
  unvisited = warm off-white, borders = moss. Hover/focus and selected states are
  CSS-only.
- Interaction model: click/Enter toggles a country; a searchable country list
  provides the keyboard- and screen-reader-friendly path to the same action.
  Both routes call the same Server Action.
- Pan/zoom, if added, uses pointer events and a transform on the SVG group. It
  must not trap scroll on touch devices, and it must be disableable via
  `prefers-reduced-motion` where animation is involved.
- Performance budget: the map route should ship the geometry as cached,
  compressible static data (gzip/brotli), not as a JS bundle string, if the size
  makes that worthwhile. Geometry is not needed for first paint of other routes.

### 7.3 Counting

Counts are derived from the user's own visits (e.g. "23 of 250"). They are
computed on the server for the initial render and updated optimistically on the
client. Counts never include other members' visits unless the UI explicitly says
so (e.g. "combined: 61").

## 8. Shared maps

A shared map is a named collection of members. Each member keeps their own
private visit data; the shared map shows a **derived view**:

- union of members' visited countries (the default),
- optional per-member filtering,
- a "new to the group" or "only you" style comparison if Phase 5 adds it.

Design constraints:

- Membership is explicit. There is no public sharing, no "anyone with the link
  can view" in the first release.
- Invitations are single-use tokens delivered by email or copyable link. The
  database stores only a hash of the token. Tokens expire and can be revoked.
- Removing a member removes their contribution from the derived view. Their
  private visits are untouched.
- A map owner can rename the map, invite, revoke invitations, and remove
  members. A member can leave. Deleting a map is owner-only and confirmed.
- The combined view is computed server-side from an authorization-scoped query.
  A client must never receive another member's raw visit list.
- Roles are intentionally minimal: `OWNER` and `MEMBER`. Editors/viewers are a
  later feature if the product needs them; adding roles early complicates every
  authorization check.

## 9. Image export

Requirement: a high-quality PNG containing **only the signed-in user's map** —
never shared-map members' histories or private account data.

Approach:

1. A dedicated, pure React component renders the export SVG from the same
   country dataset and the user's own visit set. It is not a screenshot of the
   interactive page, so hidden UI, tooltips, and other members' data cannot leak
   into it.
2. Serialize the SVG with `XMLSerializer`, encode it as a data URL, draw it to a
   `<canvas>` at a fixed high resolution (e.g. 2×–3× a 1600×1000 base).
3. Export with `canvas.toBlob("image/png")`.
4. Share via the Web Share API (`navigator.canShare({ files })`) on supported
   mobile browsers; otherwise trigger a download with `<a download>`.
5. If canvas rendering fails, fall back to downloading the SVG.

Constraints:

- No external fonts or images inside the SVG: they taint the canvas or fail to
  load. Use system font stacks and inline paths only.
- Include the product mark and a small "made with <brand>" line, the map year,
  and the count. Do not include the user's email or user id.
- The export runs client-side from data the user is already authorized to see.
  The server does not need a headless browser, which keeps hosting simple and
  avoids a second authorization surface.

## 10. Email

- Brevo's transactional HTTP API via a thin wrapper in `src/server/email/`.
- Brevo can send from a verified individual address without a domain. Domain
  authentication is still recommended for production because Gmail, Yahoo, and
  Microsoft may rewrite or flag mail from unauthenticated senders.
- Plain HTML templates with inline styles, built from the `brand` palette. No
  React Email dependency in the first release.
- Emails implemented: welcome (Phase 2), password reset (Phase 2). Invitation
  email is planned for Phase 4.
- Sending is best-effort and never blocks the primary mutation from succeeding.
  Failures are logged without tokens or message bodies.
- Without `BREVO_API_KEY`, the mailer is a no-op and logs the skipped subject;
  sign-up still succeeds.
- `welcomeEmailSentAt` on the user record prevents duplicate welcomes. If email
  is disabled at sign-up, the field stays null and the welcome is **not**
  retried later; there is no job queue yet.
- Email verification is **not enforced** initially (see `SECURITY.md`). The
  tradeoff is explicit: lower sign-up friction, higher risk of typo'd addresses.
  Reset and invitation emails still prove control of the address.

## 11. Environment variables

See `.env.example`. All are server-side except `NEXT_PUBLIC_APP_URL`.

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | metadata, links, auth callbacks | Must be the real origin in production. |
| `DATABASE_URL` | Prisma runtime | Neon pooled connection. |
| `DIRECT_URL` | Prisma migrations | Neon direct connection. |
| `BETTER_AUTH_SECRET` | Better Auth | 32+ random bytes. |
| `BETTER_AUTH_URL` | Better Auth | Origin of the app. |
| `BREVO_API_KEY` | email | Server only. |
| `EMAIL_FROM` | email | Verified Brevo sender; domain authentication recommended in production. |
| `TEST_DATABASE_URL` | integration tests | Never production. |

Validation: `src/config/env.ts` parses and validates these lazily with Zod.
Importing the module never throws, so `next build` needs no secrets; the first
request that needs configuration fails loudly with the offending variable names.
`DIRECT_URL` is optional for client generation but required for migrations.
`BREVO_API_KEY` may be absent (email is disabled). `.env` is gitignored.

`src/server/db.ts` and `src/server/auth.ts` are lazy singletons for the same
reason. The database adapter is Neon for `*.neon.tech` and `@prisma/adapter-pg`
for local Postgres.

## 12. Non-functional constraints

- **Accessibility**: WCAG 2.2 AA target. Text contrast is unit-tested in
  `src/config/brand.test.ts`; non-text map borders are checked at 3:1. The map
  always has a non-visual equivalent (list + search). Focus is visible and
  never trapped. Motion respects `prefers-reduced-motion`.
- **Responsiveness**: mobile-first. The map may pan/zoom; page chrome never
  causes horizontal scrolling.
- **Performance**: map route interactive quickly on a mid-range phone; geometry
  cached and compressed; no layout shift from late-loading fonts (system stack).
- **Privacy**: only country-level data is stored. No IP geolocation, no
  analytics, no third-party trackers. Email addresses are visible only to the
  account owner and, where required, to a map owner who invited them.
- **Portability**: standard Next.js + Prisma + Postgres; no proprietary runtime
  APIs beyond Vercel's build/deploy integration.
- **Browser support**: current evergreen Chrome, Safari, Firefox, Edge; iOS
  Safari 16+. Web Share is progressive enhancement.

## 13. Product identity and naming

The visible name is **AtlasShare** everywhere. Internally the package is
`atlasshare`; database tables use snake_case via Prisma `@@map`. Do not
introduce a second brand string for emails or exports.

## 14. Deliberate non-choices

These are not oversights; they are deferred on purpose:

- No internationalisation yet. Copy is English, but strings are kept short and
  centralised where practical so a future i18n pass is feasible.
- No dark mode. The palette is a light, warm paper theme; a dark variant would
  need a second accessible palette and a design pass.
- No real-time collaboration. Shared maps are eventually consistent: members
  see updates on the next request/revalidation, not live cursors.
- No mobile native apps. The PWA covers installability and offline shell.
- No admin panel. Support tasks are done through audited scripts, if ever needed.
