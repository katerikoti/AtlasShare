# AtlasShare — Architecture

Status: **Phase 6 (image export) is complete and approved.** Phases 1–6 are
approved. PWA functionality is still planned.
Anything marked _planned_ does not exist in the codebase yet. See
[`PROGRESS.md`](./PROGRESS.md) for what is actually built.

## 1. Purpose of this document

This is the technical map of AtlasShare: the stack, the runtime model, the
module boundaries, and the constraints that later phases must respect. If a
future change contradicts this document, either the change is wrong or this
document needs an explicit update (and, for significant choices, an ADR in
[`DECISIONS.md`](./DECISIONS.md)).

## 2. Stack

Versions are the ones installed at the end of Phase 6. Pin exact versions for
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
const access = await getMapAccess(mapId, session.user.id); // null => 404-style
```

Rationale: a proxy runs before the request is resolved and is not intended for
slow data fetching or full session management (see the Next.js Proxy docs).
Database-backed authorization cannot be safely done there.

The implemented proxy optimistically protects `/account` and `/shared`. `/map`,
`/shared`, `/shared/[mapId]`, and every Server Action still call
`requireSession()`, `getMapAccess()`, or the owner helper on the server. The
proxy deliberately does **not** redirect signed-in users away from auth pages:
Better Auth rotates the session cookie on password change, and a cookie-presence
redirect between `/account` and `/sign-in` can race that rotation into a loop. A
signed-in user seeing the sign-in form is harmless. The public `/invite/[token]`
page checks the token and signed-in email server-side; it is intentionally not
blocked by the proxy so a signed-out recipient can authenticate first.

### 5.3 Caching

Cache Components and Partial Prefetching are **disabled** (`next.config.ts`).
AtlasShare is an authenticated, request-time application; almost every screen
depends on the current user. The default is therefore dynamic rendering and no
`fetch` cache. Any future caching must be an explicit, reviewed decision with:

- a public, non-personal data boundary,
- `revalidate`/tags that are invalidated on writes,
- a test proving one user cannot see another user's data.

The country dataset and SVG geometry are public static assets and contain no
user data. The generated geometry is served from `public/map/countries.json`;
locally it is ETag-revalidated (`Cache-Control: public, max-age=0`) and
compressed by the framework. It is ~1.1 MB raw and ~377 KB compressed. A
deployment may apply a short CDN TTL, but should not use a long immutable cache
at this unversioned path because a dataset/code update must stay in sync.

### 5.4 Server Actions vs. route handlers

- **Server Actions**: marking a country, creating/renaming/deleting a shared
  map, inviting/revoking/accepting, removing a member, leaving, and updating
  account settings.
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
    page.tsx                # temporary development placeholder (landing is Phase 7)
    not-found.tsx
    icon.svg                # app icon
    (auth)/                 # sign in, sign up, forgot/reset, invite/[token]
    (app)/account/          # signed-in account settings
    (app)/map/              # personal map + route error boundary
    (app)/shared/           # shared list, create form, shared/[mapId]
    api/auth/[...all]/      # Better Auth handler
  components/
    auth/                   # sign-in/up, forgot/reset, sign-out forms
    account/                # name, password, delete-account forms
    map/                    # SVG map, country list, region bars, geometry hook
    export/                 # pure export SVG + export panel
    shared/                 # shared view, create/invite/settings/member forms
    ui/form.tsx             # field, message, button/input styles
  config/
    brand.ts                # product identity (source of truth)
    env.ts                  # lazy Zod validation of server env
  data/
    countries.ts            # canonical country helpers, codes, names, region
    countries.generated.ts  # generated names/codes; do not edit
    country-regions.ts      # canonical continent assignment for every code
    country-insights.ts     # pure region counts and shared comparison
  lib/
    auth-client.ts          # browser Better Auth client
    export-map.ts           # export input, canvas/share/download helpers
    safe-redirect.ts        # same-origin post-auth `next` validation
  server/
    auth.ts                 # lazy Better Auth instance + options
    db.ts                   # lazy Prisma client, adapter selected by host
    session.ts              # getSession + requireSession gate
    authorization.ts        # session/map membership/owner checks
    visits.ts               # user-scoped visited-country reads/writes
    shared-maps.ts          # map CRUD, combined view, invitations, membership
    invitations.ts          # token generation/hash/TTL/URL validation
    actions/                # account, visits, and shared-map Server Actions
    email/                  # Brevo wrapper, templates, all senders
    validation/             # pure Zod schemas for account/shared-map forms
  test/
    setup.ts                # Vitest setup (jest-dom)
prisma/
  schema.prisma             # auth + app models (Phase 2 migration)
  migrations/               # committed migrations
scripts/
  better-auth-schema.config.ts
  generate-countries.mjs    # reproducible country/geometry generator
public/
  map/countries.json        # generated SVG geometry, fetched at runtime
                            # PWA icons/manifest planned for Phase 7
```


Rules:

- `src/lib` must stay framework-agnostic and pure so it is cheap to unit test.
  The browser auth client is the deliberate exception (it is a client-only
  integration module).
- `src/server` may import Node APIs and the database; it must never be imported
  by a Client Component.
- `src/data` is generated data plus the hand-authored region map and pure
  insight helpers; no hand edits to generated files.
- `src/generated/prisma` is generated by `postinstall` and gitignored.

## 7. Country dataset and map

### 7.1 Dataset

The country set is a **single committed dataset**, not a runtime dependency and
not a database table. It defines the canonical list of map units, their display
names, ISO codes, and SVG paths.

Candidate sources evaluated in Phase 1:

| Source | License | Shape | Problems |
| --- | --- | --- | --- |
| `@svg-maps/world` 2.0.0 | CC-BY-4.0 | 256 SVG paths, ISO alpha-2 ids | **Selected base.** Contains territories, Kosovo (`XK`), and non-ISO extras; needs curation to the 195-country set. |
| `world-countries` 5.1.0 | ODbL | 250 country records, GeoJSON per country | No geometry for `AQ` and `XK`; ODbL share-alike is awkward for app code. Not used. |
| Natural Earth 1:10m | Public domain | 258 features | Not a clean code base: missing small states and Palestine grouped under Israel in the tested extraction. Not used. |
| Natural Earth 1:50m | Public domain | 242 features | Groups Palestine under Israel and misses small states; rejected. |

Decision: use **`@svg-maps/world` 2.0.0 as the geometry base**, filtered by
`scripts/generate-countries.mjs` to exactly **195 recognized countries**: the
193 UN member states plus the Holy See (`VA`) and Palestine (`PS`). The
generator has a single canonical code list, rejects any installed source version
other than `2.0.0`, normalizes display names, sorts by code, and asserts 195
metadata entries and 195 SVG paths. It writes `src/data/countries.generated.ts`
and `public/map/countries.json`; both are committed and deterministic. The
helper in `src/data/countries.ts` is the single import surface for codes and
names.

The filtered set excludes dependent territories, Kosovo (`XK`), Taiwan (`TW`),
Western Sahara (`EH`), Antarctica (`AQ`), and all other non-state units. This is
a product-scope decision (ADR-032), not a statement about contested boundaries.
The Holy See's display name is **"Holy See (Vatican City)"** so both terms are
searchable; its code is `VA`. Palestine (`PS`) and Israel (`IL`) remain separate
units and are never merged.

Decision (Phase 5, ADR-029): every country also carries one continent-level
`region`. The assignment lives in `src/data/country-regions.ts`, follows the
United Nations M49 geoscheme at the continent level, and is attached to the
generated list by `src/data/countries.ts`. Transcontinental units use their UN
region (Russia → Europe, Türkiye → Asia). This keeps `countries` as the single
import surface while leaving the geometry generator unchanged. A test asserts
exactly one assignment per country and that region totals sum to 195 (Africa 54,
Americas 35, Asia 48, Europe 44, Oceania 14).

Identifier rules:

- Store ISO 3166-1 alpha-2 codes, uppercase, as the primary key of a visit.
- Every code must be one of the 195 canonical countries. There is no
  user-assigned-code exception after the dataset revision.
- Never key data on display names or SVG path ids that differ from the codes.
- Validate every incoming code against the committed dataset on the server.
- **Palestine (`PS`) is a country and is always its own map unit.** It is never
  merged into Israel or any other path.
- Attribution for the CC-BY-4.0 source lives in the map's "About the map data"
  disclosure and the repository docs. The former Antarctica outline and its
  Natural Earth attribution were removed with the 195-country conversion.

### 7.2 Rendering

- A hand-built React SVG map with `viewBox="0 0 1010 760"`, generated from the
  committed dataset. No map library, tile server, or runtime geo dependency.
- Geometry is fetched after first paint from `/map/countries.json` and validated
  against all 195 codes. It is not bundled into the client JavaScript. The map
  has its own loading and retry states.
- Each unit is a `<path>` with `data-country="SE"` and `data-visited`; the SVG
  has an accessible name via `<title>`, and each path has a country title. The
  parallel country list is the accessible control surface rather than 195
  focusable SVG nodes.
- Fills come from CSS classes driven by the design tokens: visited = dusty rose,
  unvisited = warm off-white, borders = moss. The list is keyboard accessible;
  map paths are pointer/touch shortcuts to the same action.
- Interaction model: click/tap toggles a country; the searchable country list
  provides the keyboard- and screen-reader-friendly path to the same action.
  Both routes call the same Server Action and use optimistic state with rollback.
- The country list stays deliberately simple: one search field and an
  alphabetical, height-limited checklist. There are no visited/region/sort
  controls after owner review. A checked row changes the country name and
  checkbox to dusty rose, with no separate \"visited\" text. The map legend and
  explanatory note were also removed as redundant.
- On narrow screens the map comes first, followed by the country list, with no
  pan/zoom dependency. From `lg` upward the map and list sit side by side. There
  is no pan/zoom implementation.
- The asset is ~1.1 MB raw and ~377 KB compressed in local production, served
  with ETag revalidation. It contains only public geometry, never visit data.
- The map route shows a server-rendered count and progress, a Suspense skeleton
  while the user's visits load, and a route error boundary; no private data is
  rendered in the fallback.
- Performance budget: geometry is cached/compressible static data, not a JS
  bundle string. The country list remains usable while the map geometry loads
  or if it fails; the map is a visual aid, not the only input path.

### 7.3 Counting

Counts are derived from the user's own visits (e.g. "23 of 195"). They are
computed on the server for the initial render and updated optimistically on the
client. Counts never include other members' visits unless the UI explicitly says
so (e.g. "combined: 61").

The region breakdown is computed on the client from the same visit set (or the
authorized shared view set). Each row shows marked countries out of that
region's dataset total, with a CSS bar; the marked values sum to the headline
count. No charting library is used. Shared views label the same rows "not
marked" for the "not yet by anyone" comparison so the words match the set.

### 7.4 Insights and comparison

Phase 5 adds derived views only; it stores nothing new.

- Region statistics and the shared comparison are pure functions in
  `src/data/country-insights.ts`, covered by unit tests. Personal search
  filtering stays local to the map component.
- A shared comparison is derived from the already-authorized aggregate view:
  - **Visited by everyone**: combined count equals the member count.
  - **Only you**: the signed-in member's codes whose combined count is one.
  - **Not yet by anyone**: dataset codes absent from the combined union.
- The comparison reads country codes and counts from the same view the client
  already receives for the per-member filter. It performs no additional visit
  query and exposes no new identity or private field. Members already see each
  other's country-level marks, so the comparison does not widen the disclosure.
- The UI issues no claim when the sets are empty; "not yet by anyone" also has a
  distinct empty state. Lists are height-limited and scroll on mobile.

## 8. Shared maps

A shared map is a named collection of members. Each member keeps their own
private visit data; the shared map shows a **derived view**:

- union of members' visited countries (the default),
- per-member filtering,
- derived comparison sets: visited by everyone, only you, and not yet by anyone
  (ADR-030).

Design constraints:

- Membership is explicit. There is no public sharing, no "anyone with the link
  can view" in the first release.
- Invitations are single-use 256-bit tokens delivered by email or copyable link.
  The database stores only a SHA-256 hash. Tokens expire after 7 days, are
  revoked on replacement, and are marked accepted atomically.
- The invited email must match the signed-in account. Email verification is not
  enforced (see `SECURITY.md`), so this is a string match, not independent proof
  of address control.
- Removing a member removes their contribution from the derived view. Their
  private visits are untouched. The owner cannot leave; the map must be deleted.
- A map owner can rename the map, invite, revoke invitations, remove members,
  and delete the map. A member can leave. Deleting a map is owner-only and
  requires typing `DELETE`.
- The combined view is computed server-side from an authorization-scoped query.
  The client receives member display names, membership ids, and deduplicated
  country-code sets so the filter works. It never receives raw visit rows,
  emails, user ids, notes, or visit dates. Pending invitation emails are
  owner-only.
- The shared view is read-only for everyone. Members change their own map on
  `/map`; shared pages do not mutate personal visits.
- Roles are intentionally minimal: `OWNER` and `MEMBER`. Editors/viewers are a
  later feature if the product needs them; adding roles early complicates every
  authorization check.
- Acceptance and invitation creation are not rate-limited. Token entropy makes
  guessing infeasible, but this remains a hardening item.

## 9. Image export

Requirement: a high-quality PNG containing the signed-in user's personal map,
or on a shared map the combined marks of all members (or the selected member's
marks), without member names, emails, account ids, per-member breakdowns, map
names, notes, visit dates, or other private account data.

Implemented approach:

1. `src/components/export/export-map-svg.tsx` is a pure React SVG component. It
   receives only `{ visited, count, displayName?, year }` plus public geometry;
   it is not a screenshot of the interactive page, so hidden UI, tooltips,
   member names, and private account metadata cannot leak into it.
2. `src/lib/export-map.ts` serializes the SVG with `XMLSerializer`, wraps it in a
   blob URL, draws it to a `<canvas>` at 2× a 1600 × 1000 base (3200 × 2000),
   and converts it with `canvas.toBlob("image/png")`.
3. The PNG is offered through the Web Share API (`navigator.canShare({ files })`)
   when supported; otherwise it is downloaded with `<a download>`. A cancelled
   share does not trigger a download.
4. If canvas creation, image loading, drawing, or PNG encoding fails, the same
   SVG is downloaded instead.
5. The panel appears on `/map` and on a shared map. The shared page passes the
   combined country codes by default, or the selected member's codes; comparison
   filters are view-only and do not change the export. It never passes member
   names, the map name, emails, ids, per-member counts, notes, or visit dates.
   The optional title is user-entered, not account metadata.

Constraints:

- No external fonts or images inside the SVG: they taint the canvas or fail to
  load. Use system font stacks and inline paths only. Tests assert there are no
  `<image>`, `<foreignObject>`, or `href` elements.
- Include the product mark and a small "made with <brand>" line, the map year,
  and the count. Do not include the user's email or user id.
- The export runs client-side from data the user is already authorized to see.
  The server does not need a headless browser, which keeps hosting simple and
  avoids a second authorization surface.
- The export is one landscape layout; an aspect-ratio picker was deferred as
  unnecessary extra layout/QA surface. The 3200 × 2000 output is below typical
  mobile canvas limits.

## 10. Email

- Brevo's transactional HTTP API via a thin wrapper in `src/server/email/`.
- Brevo can send from a verified individual address without a domain. Domain
  authentication is still recommended for production because Gmail, Yahoo, and
  Microsoft may rewrite or flag mail from unauthenticated senders.
- Plain HTML templates with inline styles, built from the `brand` palette. No
  React Email dependency in the first release.
- Emails implemented: welcome (Phase 2), password reset (Phase 2), and shared
  map invitation (Phase 4).
- Sending is best-effort and never blocks the primary mutation from succeeding.
  The owner can copy the invitation link if sending is skipped or fails.
  Failures are logged without tokens or message bodies.
- Without `BREVO_API_KEY`, the mailer is a no-op and logs the skipped subject;
  sign-up and invitation creation still succeed.
- `welcomeEmailSentAt` on the user record prevents duplicate welcomes. If email
  is disabled at sign-up, the field stays null and the welcome is **not**
  retried later; there is no job queue or invitation retry.
- Email verification is **not enforced** initially (see `SECURITY.md`). The
  tradeoff is explicit: lower sign-up friction, higher risk of typo'd addresses.
  Password-reset delivery proves control when it reaches the real inbox, but
  invitation acceptance only compares the unverified account email string.

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
- **Responsiveness**: mobile-first. On narrow screens the map comes first and
  the country list follows; no pan/zoom is required. Page chrome and the map
  card never cause horizontal scrolling at 320 px (verified in a browser).
- **Performance**: map route interactive quickly on a mid-range phone; geometry
  is compressible static data (~1.1 MB raw, ~377 KB compressed locally) and is
  ETag-revalidated; no layout shift from late-loading fonts (system stack).
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
