# AtlasShare — Product Specification

Status: **agreed direction, Phase 2 implemented.** Requirements here are the
target for the whole build. Each phase implements a slice; see
`DEVELOPMENT_PLAN.md`.

## 1. One-sentence product

AtlasShare lets you mark the countries you have visited on a beautiful personal
world map, then combine your map with the people you travel with.

## 2. Problem

Travel history is scattered across photos, messages, and memory. Existing map
tools are either social networks that want your whole life, or static image
generators that cannot represent a group. People who travel together want one
shared view without handing over their account or private data.

## 3. Audience

- **The collector** — enjoys tracking countries and seeing the count grow.
- **The couple/partner** — wants a combined map of "our" travels.
- **The friend group / family** — plans trips together and wants to see who has
  been where.
- **The low-key traveller** — wants a private map and a nice image to share,
  without a social feed.

Not the audience: professional travel agents, itinerary planners, flight
loggers, or people who want street-level location tracking.

## 4. Principles

1. **Private by default.** Nothing is public. Sharing is an explicit,
   per-map invitation.
2. **Country level only.** No cities, no coordinates, no live location.
3. **Fast and quiet.** No feed, no notifications spam, no gamification guilt.
4. **One good map.** A crafted SVG, not a generic map library with a skin.
5. **Exportable.** The user's map leaves the app as a clean image.
6. **Accessible.** Keyboard and screen-reader paths for every core action.

## 5. Core concepts

| Term | Meaning |
| --- | --- |
| **Visit** | A country marked as visited by one user. Private. |
| **Personal map** | The signed-in user's own visits and derived statistics. |
| **Shared map** | A named group with members. Shows a combined view. |
| **Member** | A user who can see a shared map. Roles: owner, member. |
| **Invitation** | A single-use, expiring link sent to one email address. |
| **Country set** | The canonical list of map units. See §6. |

## 6. Country definition (resolved)

**Decision (D1, 2026-10-26):** Use **250 countries & territories**: 249 ISO
3166-1 entries plus Kosovo. Label the feature "countries & territories"
consistently, and count territories separately from their sovereign state.
Kosovo is included as `XK` (documented exception).

**Palestine and Israel:** Palestine (`PS`) and Israel (`IL`) are both standalone
map units with their own visited state. Palestine must never be merged into
Israel or any other entry. The dataset generator must explicitly verify separate
paths and labels (Natural Earth's default grouping is not acceptable). Including
both is a comprehensive-dataset decision, not a political endorsement.

## 7. Functional requirements

### 7.1 Accounts (Phase 2)

- **FR-A1** Sign up with email + password. Name (display) required, email
  normalized, password hashed.
- **FR-A2** Sign in / sign out. Generic error messages. Rate limited.
- **FR-A3** Request a password reset by email; use a single-use, expiring link
  to set a new password.
- **FR-A4** Session persists across reloads; sign-out invalidates it server-side.
- **FR-A5** Send a welcome email once, tracked by `welcomeEmailSentAt`. Email
  failure never blocks account creation.
- **FR-A6** Account settings: change display name; change password; delete
  account (with explicit confirmation and a warning about owned shared maps).
- **FR-A7** Email verification is not required initially; the account page shows
  the address and, later, a verification action.

### 7.2 Personal map (Phase 3)

- **FR-M1** Show a world map of the canonical country set.
- **FR-M2** Mark/unmark a country as visited; changes persist server-side and
  survive reload. Toggling is idempotent.
- **FR-M3** Visited countries use the dusty-rose fill; unvisited use warm
  off-white; borders use moss. Legend explains the states.
- **FR-M4** A searchable, keyboard-accessible country list offers the same
  toggle action as the map.
- **FR-M5** Show a count ("23 of 250 countries & territories") and a progress
  indicator.
- **FR-M6** The initial release stores only visited/unvisited state. Notes and
  visit dates are out of scope (D2).
- **FR-M7** The map is usable on a phone (pan/zoom or a list-first fallback) and
  never causes page-level horizontal scroll.
- **FR-M8** Empty state explains the first action without a modal wall.
- **FR-M9** The map renders correctly with zero visited countries.

### 7.3 Shared maps (Phase 4)

- **FR-S1** Create a shared map with a name (and optional description). The
  creator becomes owner and a member.
- **FR-S2** List the maps the user belongs to, with member count and combined
  count.
- **FR-S3** Invite one email address at a time; send an email and offer a
  copyable link. Invitations expire (7 days) and are single-use.
- **FR-S4** Accept an invitation only when signed in as the invited email; join
  the map; show a clear error for expired/revoked/used invites.
- **FR-S5** Owner can revoke pending invitations and remove members.
- **FR-S6** Member can leave a map. Owner can delete a map (confirmed).
- **FR-S7** Shared map view shows the combined map: countries visited by any
  member, plus a per-member filter (at least "everyone" and one member at a
  time).
- **FR-S8** Show combined count and per-member counts. The initial release
  stores no notes or visit dates to expose.
- **FR-S9** Non-members get a 404-style response, not a permission error.
- **FR-S10** Removing a member immediately changes the combined view.

### 7.4 Insights & filters (Phase 5)

- **FR-T2** Filter/sort the country list by visited state, region, and name.
- **FR-T3** Statistics: total visited, percentage of the set, counts by region
  or continent.
- **FR-T4** Shared map comparison: "visited by everyone", "only you", "not yet
  by anyone" — if it fits the phase without leaking private data.

**Out of scope (D2):** per-country notes, first-visited dates, and visit-history
UI. Repeat visits would need a separate visit-history model if ever added.

### 7.5 Image export (Phase 6)

- **FR-E1** Export the signed-in user's personal map as a PNG at high resolution.
- **FR-E2** The image contains only that user's visits and public brand
  information — never other members' data, email, or ids.
- **FR-E3** Include the count and a small brand mark; clean typography; no
  browser chrome.
- **FR-E4** Use the native share sheet when file sharing is supported; otherwise
  download the PNG. Fall back to SVG if canvas fails.
- **FR-E5** Export works on mobile Safari and Chrome.

### 7.6 Public site (Phase 7)

- **FR-P1** Landing page explaining the product with a clear sign-up CTA.
- **FR-P2** Privacy page and a short "about the map data" attribution note.
- **FR-P3** Signed-in users are routed to their map, not the marketing page.
- **FR-P4** Metadata and Open Graph image for link previews.
- **FR-P5** No misleading claims (no "track every trip" if only countries exist).

### 7.7 PWA (Phase 7)

- **FR-W1** Installable: manifest, icons, theme color, standalone display.
- **FR-W2** Offline shell shows a branded offline page; no stale private data.
- **FR-W3** Never cache authenticated data or private API responses.
- **FR-W4** Update flow does not trap users on an old build.

### 7.8 Cross-cutting

- **FR-X1** All destructive actions confirm and are reversible where possible
  (leaving a map is reversible by re-invite; deleting an account is not).
- **FR-X2** Every error state has a human message and a next step.
- **FR-X3** Loading states avoid layout shift and do not flash private data.
- **FR-X4** The product name comes from `brand.ts`.

## 8. Non-functional requirements

- **NFR-1 Accessibility**: WCAG 2.2 AA. Keyboard access to every action, visible
  focus, sensible landmarks, reduced-motion support. Contrast is unit-tested.
- **NFR-2 Performance**: map route interactive within ~2.5 s on a mid-range
  phone over 4G; no blocking third-party scripts.
- **NFR-3 Responsive**: 320 px to large desktop; no horizontal scroll.
- **NFR-4 Privacy**: country-level data only; no analytics or trackers.
- **NFR-5 Security**: server-side authorization on every private read/write;
  hashed invite tokens; rate-limited auth.
- **NFR-6 Reliability**: a failed email send never loses the underlying action;
  toggles are idempotent.
- **NFR-7 Maintainability**: TypeScript strict, small pure modules, tests for
  data and authorization logic, docs updated each phase.
- **NFR-8 Portability**: standard Next.js + Postgres; no vendor lock-in beyond
  hosting conveniences.

## 9. Out of scope (for the whole first release)

- Cities, regions, coordinates, routes, flights, or live location.
- Photo uploads, trip journals, itineraries, or booking links.
- Public profiles, feeds, likes, comments, or follower graphs.
- Real-time collaborative editing.
- Native iOS/Android apps.
- Payments, subscriptions, or ads.
- Product analytics, tracking pixels, or social login beyond a possible later
  OAuth addition. Brevo's transactional-email telemetry and unsubscribe header
  are provider behavior, disclosed in the privacy notes.
- Admin dashboards.
- Internationalisation (English only for now).

## 10. Success criteria for the first release

1. A new user can sign up, mark countries, and see a correct count in under two
   minutes without help.
2. Two users can share a map and both see the combined view; neither can see the
   other's private account data.
3. A non-member cannot read a shared map by guessing its id.
4. An exported PNG contains exactly the exporter's data and looks good at
   phone-share resolution.
5. The app is installable, works offline as a shell, and never shows another
   user's cached page.
6. All phase gates have passing checks, and the documented test results are
   honest (including skipped tests).

## 11. Assumptions and dependencies

- A Neon dev branch is connected and migrated; production deployment is pending.
  Brevo is not configured. Phase 2 used local PostgreSQL and a disabled mailer.
- The GitHub repository remains the deployment source.
- A custom domain (if any) is decided before Phase 8. Brevo can verify an
  individual sender without a domain; an authenticated domain is recommended for
  production deliverability.
- The country dataset can be generated reproducibly; the licence permits
  redistribution with attribution.
- No legal entity or privacy policy lawyer is assumed; the privacy page is a
  plain-language description of actual data handling, reviewed for accuracy.

## 12. Decisions and open questions

| # | Decision | Status / needed by | Outcome or recommendation |
| --- | --- | --- | --- |
| D1 | Country set | Resolved 2026-10-26 | 250 countries & territories; `PS` and `IL` both standalone |
| D2 | Notes and visit dates | Resolved 2026-10-26 | Visited state only; notes/dates out of scope |
| D3 | Shared map roles beyond owner/member | Phase 4 start | Owner + member only |
| D4 | Rate-limit storage | Resolved in Phase 2 | In-memory, production-only; move to a shared store if abuse appears |
| D5 | Custom domain / email sender | Phase 8 | Custom domain recommended for production email deliverability |
