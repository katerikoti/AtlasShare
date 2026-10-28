# AtlasShare — Security

Status: **Phase 6 image export is complete and approved.** Phases 1–6 are
approved. PWA is not implemented. This document
states the rules that every phase must satisfy. Deviations require an explicit
decision in `DECISIONS.md`.

## 1. Assets

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| Account credentials and sessions | Account takeover exposes all travel data | Better Auth tables, cookies |
| A user's visited countries | Personal travel history; can reveal habits | `visited_countries` |
| Shared map membership and invitations | Unauthorized access to other people's data | `shared_maps*` tables |
| Email addresses | PII, phishing/spam target | `user.email`, invitation email |
| Secrets (DB URL, auth secret, Brevo key) | Full compromise | Environment variables only |
| Invitation tokens | Grant access to a shared map | Emailed/copied link; hash in DB |

Explicit non-assets: there is no payment data, no precise location, no address
book, and no third-party analytics profile.

## 2. Trust boundaries

```
untrusted: browser, URL, form fields, headers, invitation links, uploaded/imported data (future)
──────────────────────────────────────────────────────────────────────────────
trusted:   Next.js server runtime, Server Actions, route handlers, Prisma, Neon
──────────────────────────────────────────────────────────────────────────────
external:  Brevo (receives email address + message content only)
```

Rules:

- Everything from the browser is untrusted, including hidden form fields,
  country codes, map ids, and "role" values.
- The client never decides permissions. The server re-derives the session and
  membership for every mutation and every private read.
- Hiding a button is UX, not authorization.
- The proxy (`proxy.ts`) may only do optimistic redirects; it is not a security
  boundary.

## 3. Authentication

- **Better Auth** with database sessions and the Prisma adapter.
- Email + password is the first provider. OAuth may be added later; it must link
  accounts by verified email only.
- Passwords are hashed by Better Auth (scrypt by default). We never see or log
  plaintext passwords. The implemented policy is **12–128 characters**; no
  breached-password list is shipped yet.
- Sessions: HTTP-only, `Secure` in production, `SameSite=Lax`, path `/`,
  30-day lifetime with a one-day rolling update. Session data is not duplicated
  in a cache cookie, so revocation takes effect on the next request.
- Sign-out invalidates the server session, not just the cookie.
- Changing a password revokes **all** sessions, including the current one, and
  redirects to sign-in. This avoids a session-rotation race and guarantees other
  devices are signed out.
- **Email verification is enforced (ADR-036, 2026-10-28).** A new account cannot
  sign in, and receives no session, until its address is confirmed with a
  6-digit code emailed to it. The code is valid for 10 minutes and allows 5
  tries; after that even the correct code is refused until a new one is
  requested. Only a hash of the code is stored (`storeOTP: "hashed"`), a new
  code replaces the old one, and a code works once. Signing in to an unverified
  account (after the correct password) emails a fresh code, and the response for
  a wrong password is unchanged, so this does not reveal whether an address is
  registered. Verifying signs the person in and then sends the welcome email.
  - **Squatting is closed.** A sign-up for an address that only has a
    never-verified account first deletes that unverified account
    (`src/server/unverified-accounts.ts`), so someone who registers another
    person's address cannot leave their own password on the account the real
    owner later verifies. Unverified accounts hold no sessions, visits, or
    memberships, and verified accounts are never touched.
  - **Sign-up for an already-verified address** returns the same generic success
    as any other sign-up and changes nothing; the person sees the code screen but
    no code arrives (there is no "you already have an account" email yet).
  - **Unused code flows are disabled.** The plugin's passwordless sign-in and
    password-reset-by-code endpoints exist but cannot create accounts
    (`disableSignUp`) and `sendVerificationOTP` sends nothing for any type other
    than `email-verification`; tests and a live run confirmed no account is
    created and no mail is sent.
  - **Remaining risk:** anyone can ask for a verification code for any address,
    which can be used to annoy a recipient. Production rate limits slow this
    (sign-up 5 per hour and the plugin's own limit), but they are per-instance
    memory (see below). Development prints the code to the server console when
    mail cannot be sent; production never logs a code.
  - Existing accounts from before this change were marked verified once (the
    owner's decision). A password reset still proves control of the inbox but
    does not mark an account verified.
- Password reset uses Better Auth's verification flow: a single-use token with a
  one-hour lifetime; success revokes sessions; the request response is identical
  whether or not the email exists.
- **Known deviation:** Better Auth 1.7.12 stores the password-reset token inside
  `verification.identifier` (`reset-password:<token>`) rather than hashing it.
  Accepted for now because it is single-use and short-lived; a custom reset flow
  would be required to hash it at rest. Invitation tokens remain hashed by
  design.
- Sign-in failures are generic: "Invalid email or password", regardless of
  whether the email exists. Sign-up necessarily reports that an existing address
  is already registered.
- Account deletion is enabled, requires the current password plus a typed
  `DELETE` confirmation, and deletes immediately. Prisma cascades remove
  sessions, visits, owned maps, memberships, and invitations. Better Auth's
  delete endpoint is disabled by default and was explicitly enabled in Phase 2.

## 4. Authorization

The single most important rule: **every query that touches private data is
scoped by the authenticated user or by a verified membership.**

- Personal visits: `where: { userId: session.user.id }`. There is no endpoint
  that accepts a `userId` from the client.
- Shared maps: `getMapAccess(mapId, userId)` returns the map + membership or
  `null`; the page renders `notFound()`. All member/invitation mutations use
  the same helper. Owner-only actions (rename, delete, invite, revoke, remove
  member) additionally check `role === "OWNER"` server-side.
- Authorization failures for private maps return **404**, not 403, so the
  existence of a map is not disclosed to non-members.
- Removing a member or revoking an invite takes effect immediately on the next
  request. No cached member lists.
- The combined map view is computed server-side. The client receives member
  display names, membership ids, and deduplicated country-code sets so the
  member filter works, plus combined counts. It does not receive emails, user
  ids, raw visit rows, notes, or visit dates. Pending invitation emails are
  returned only to the owner.
- The Phase 5 comparison is derived in the browser from that same authorized
  view: "visited by everyone" uses the published per-country counts, "only you"
  intersects the signed-in member's own codes with count-one codes, and "not yet
  by anyone" uses the public dataset minus the combined codes. It issues no new
  query and discloses no field that the per-member filter did not already send.
  Region statistics are counts over the current view, not another person's raw
  rows.
- The shared-map page renders its **Members and settings** dropdown (member list,
  Remove/Leave, Invite someone, Pending invitations, Map details, Danger zone) on
  the server (ADR-035). Owner-only parts are produced only when
  `requireMapAccess` returns the `OWNER` role, so a member's response contains no
  invitation emails or invite controls; the Server Actions still re-check the
  role on every call. Putting these controls inside a collapsed dropdown is
  presentation only.

Test requirement: for each new server action, at least one test proves a
non-member cannot perform it and cannot read the data.

## 5. Input validation

- Validate at the boundary with a schema library (Zod, added in Phase 2) and
  re-validate inside the server action. Do not rely on the form.
- Country codes: exactly two uppercase A–Z characters and present in the
  committed dataset. Reject `XX`, lowercase, and unknown codes.
- Ids: opaque `cuid`/UUID format; never interpolate into SQL (Prisma
  parameterizes).
- Text: trim, enforce max lengths in the database **and** the schema. Map name
  ≤ 80 chars, description ≤ 280, email ≤ 320. Notes are not exposed (D2).
- Emails: normalize to lowercase + trim; validate with a conservative pattern
  and let the email provider reject the rest.
- Reject unexpected fields rather than ignoring them silently for security-
  relevant actions.
- File uploads/imports are out of scope. If added, they need type sniffing, size
  limits, and never-serve-as-HTML handling.

## 6. Output handling

- React escapes text by default. `dangerouslySetInnerHTML` is prohibited except
  for a static, reviewed string (none planned).
- User-provided text (display name, map name, description) is rendered as text,
  never as markup.
- URLs derived from user input are not allowed. Invitation links are built from
  `NEXT_PUBLIC_APP_URL` + a server-generated token.
- The interactive SVG map only renders dataset-controlled path data from the
  committed generator. It never contains user text. If a future feature lets
  users import geometry, it must be sanitized and never injected raw.
- The export SVG contains the optional user-entered image title only as a React
  text node; markup characters are escaped, and tests assert that a
  `<script>`-shaped title does not create an element.
- Visited codes come from the server and are validated against the 195-country
  dataset; the public geometry JSON contains no visit data.

## 7. CSRF and request forgery

- Better Auth validates origins for its endpoints.
- Server Actions are same-origin POSTs with Next.js's built-in action checks;
  still treat the payload as untrusted.
- Client auth forms use `method="post"` so a failed JavaScript boot cannot
  submit a password in a URL query string.
- Cookies are `SameSite=Lax`, which blocks cross-site POSTs from carrying the
  session for top-level navigations.
- No state-changing GET requests.
- Invitation acceptance is a POST that requires the signed-in user's email to
  match the invitation email. A different account cannot redeem it. Because every
  account's address is now verified with an emailed code before it can sign in,
  a forwarded link can no longer be redeemed by simply registering the invited
  address: the person would also need access to that inbox.

## 8. Invitation tokens

- Generate 32 random bytes (base64url) with a CSPRNG.
- Store only `SHA-256(token)` in `tokenHash`. The raw token exists only in the
  email/link.
- Single use: acceptance stamps `acceptedAt` atomically; a second attempt fails.
- Expiry: 7 days. Revocable by the owner. Expired/revoked tokens are rejected
  with the same generic message as invalid ones.
- Acceptance is **not rate-limited**. The 256-bit token makes guessing
  infeasible, but a shared limiter is still a pre-launch hardening item.
- Application code does not log tokens, and invite responses send
  `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, and
  `Cache-Control: private, no-store`. The raw token is necessarily in the
  request path, so hosting/proxy access logs can record it; restrict log access
  and retention in production.
- Invitations are per-email. Copyable links still target one address. Changing
  the invitation email requires revoking and re-inviting. Because email
  verification is not enforced, a forwarded link can be redeemed by whoever
  registers the unregistered invited address first; see accepted risks.

## 9. Rate limiting and abuse

Phase 2 baseline, implemented with Better Auth's built-in limiter:

| Action | Implemented limit |
| --- | --- |
| Sign-in attempts | 10 per IP per 15 min |
| Sign-up | 5 per IP per hour |
| Password reset request | 3 per IP per hour |
| Password reset submit | 10 per IP per 15 min |

Storage decision: **per-instance memory**, enabled only when
`NODE_ENV=production`. This is a speed bump, not a shared limit; on serverless,
each instance has its own counters. If abuse becomes real, move to a shared
store (database or managed limiter) and update this section. Limits were not
exhausted during verification because that would lock the test IP.

Shared-map Server Actions (create, invite, revoke, accept, remove, leave,
delete) are **not covered by these limits**. In particular, invitation
acceptance has no rate limit; see §8 and §20.

## 10. Secrets and configuration

- Secrets only in environment variables; never in the repo, never `NEXT_PUBLIC_*`.
- `.env*` is gitignored; `.env.example` contains placeholders only.
- Rotate the auth secret / Brevo key if leaked. Rotating `BETTER_AUTH_SECRET`
  invalidates sessions (acceptable).
- Separate Neon branches/databases per environment. Preview deployments must not
  use the production database.
- The Brevo API key is server-only; emails are sent from server code.
- Do not print env values in build logs or error pages.

## 11. Transport and headers

Production (Phase 8):

- HTTPS only; HSTS with a long max-age after the domain is stable.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` (invite routes send
  `no-referrer` plus `X-Robots-Tag` and `private, no-store` today)
- `Permissions-Policy` denying camera, microphone, geolocation
- `frame-ancestors 'none'` via CSP; no embedding
- Content-Security-Policy with a nonce/hash strategy compatible with Next.js 16
  (inline bootstrap scripts). Start in report-only, then enforce. The map and
  export must work without `unsafe-eval`.
- Cookies: `Secure`, `HttpOnly`, `SameSite=Lax`.

## 12. PWA and caching

- The service worker may cache the app shell, static assets, and the country
  dataset.
- It must **never** cache authenticated HTML, `/api/*` responses, Server Action
  responses, or any response containing user data.
- Navigation requests go to the network; offline shows a static offline page.
- Cache versioning and cleanup on activate; a stale cache must not serve another
  user's page after sign-out. On sign-out, clear runtime caches that could
  contain personal data (defense in depth).

## 13. Image export

- Rendered from the signed-in user's personal data, or on a shared map the
  combined members' country marks (or the selected member's marks). The export
  component takes an explicit, minimal input: `visited`, `count`, optional
  user-entered `displayName`, and `year`. It does not receive member names, map
  names, emails, user ids, per-member counts or breakdowns, notes, visit dates,
  or other account metadata.
- The personal and shared pages both use this component. The shared page passes
  the combined country codes by default, or the selected member's codes; tests
  assert that the combined marks are present and that member names and the map
  name stay out of the image. A shared image can reveal the group's combined
  travel footprint to anyone it is shared with, but not who marked a country.
- No remote images/fonts (prevents canvas tainting and data exfiltration). The
  SVG has no `<image>`, `<foreignObject>`, or `href` elements.
- No tokens, emails, or ids embedded in PNG metadata. Canvas output has none by
  default; do not add custom metadata.
- The PNG is 3200 × 2000 (2× a 1600 × 1000 base). Canvas failure downloads the
  same inline SVG instead; it does not send data to a server.
- The export runs locally in the browser; no server-side headless browser, no
  upload, and no URL containing the user's visit set.

## 14. Email

- Plain HTML with inline styles; the app adds no tracking pixels. Brevo records
  delivery/open telemetry and injects a `List-Unsubscribe` header into
  transactional mail, which Gmail may display as an unsubscribe control. Review
  or disable provider tracking before launch if strict no-tracking is required.
- Clicking Gmail's unsubscribe control can suppress future transactional email;
  it is not an app account setting. Re-enable the address in Brevo if clicked by
  mistake.
- Links are absolute and built from the configured app URL.
- Never include passwords, tokens other than the intended single-use link, or
  other users' email addresses.
- Brevo receives the recipient address and message body. That is the only data
  processor besides Neon/Vercel.
- Bounce/complaint handling: Brevo dashboard for now; a suppression list is a
  later concern.

## 15. Logging and monitoring

- Security-relevant events should be logged without PII: invitation
  accepted/revoked (ids only), authorization denials, and rate-limit trips. The
  current implementation logs action failures with generic context only; there
  is no structured audit trail yet.
- Never log passwords, session tokens, invitation tokens, full email bodies, or
  full connection strings. Note that the invite token is in the request path, so
  access-log configuration must account for that.
- Error tracking, if added, must scrub request bodies and cookies.
- Server errors return a generic message to the client; details stay in logs.

## 16. Dependencies and supply chain

- `npm ci` in CI; commit `package-lock.json`.
- Run `npm audit` before each phase gate; triage findings rather than ignoring
  them. Record unresolved highs in `PROGRESS.md`.
- Prefer well-maintained, widely used packages. Every new dependency needs a
  reason in the PR/commit and, for auth/database/email, an ADR.
- No postinstall scripts from unknown packages. Review if npm reports them.
- Keep Node and Next.js on supported releases; upgrade deliberately and re-run
  all checks.

## 17. Privacy

- Collect the minimum: name (optional display), email, password hash, country
  codes, map membership. Notes and visit dates are not collected (D2).
- No analytics, ads, fingerprinting, or geolocation.
- A user can delete their account and all their data. Owned shared maps are
  deleted for all members; the UI must say so before confirming.
- A user can leave a shared map without deleting their account.
- Emails are not shown to other members by default; a display name is.
- Data export (JSON) is a nice-to-have; if added, it includes only the
  requesting user's data.

## 18. Incident response (small-project baseline)

1. Contain: rotate the affected secret, revoke sessions if auth is implicated.
2. Assess: which tables/endpoints, which users, what data.
3. Fix and deploy with a regression test.
4. Notify affected users if personal data was exposed; document what happened
   in `PROGRESS.md`/`CHANGELOG.md` without exposing secrets.
5. Add a preventive check (test, header, limit).

## 19. Phase gate checklist

Before a phase is approved:

- [ ] New server actions validate input and re-check authorization.
- [ ] At least one negative authorization test per new private resource.
- [ ] No secret, token, or PII in logs, client bundles, or committed files.
- [ ] `npm run check` and `npm run build` pass.
- [ ] New dependencies reviewed and recorded.
- [ ] Security-relevant doc updates made (`SECURITY.md`, `DATABASE.md`).
- [ ] `npm audit` reviewed; unresolved issues listed in `PROGRESS.md`.

## 20. Accepted risks (current)

| Risk | Why accepted | Revisit |
| --- | --- | --- |
| Verification-code emails can be requested for any address (nuisance email) | Codes are harmless without the inbox; production rate limits apply | Before public launch (shared limiter) |
| Never-verified accounts are not purged | No cleanup job yet; they hold no data and can sign in to nothing | Before public launch (add a scheduled purge) |
| Sign-up for an already-verified address sends no "account exists" email | Keeps sign-up responses generic; the code screen links to sign-in | If users report confusion |
| No MFA | Scope; password + rate limiting first | Post-launch |
| Per-instance rate limiting may be weak on serverless | Simplicity; limits still slow brute force | When abuse is observed or before public launch |
| Shared-map actions, including invite acceptance, have no rate limit | 256-bit tokens make guessing infeasible; implementation complexity deferred | Before public launch / Phase 8 |
| Invitation token appears in the URL path and hosting access logs | Needed for a clickable link; app does not log it and sends no-referrer/no-store headers | Before production; restrict log access/retention |
| Invitation email is best-effort with no retry/bounce handling | Owner can copy the link; no job queue yet | Phase 8 or when Brevo domain auth is configured |
| Password-reset token stored raw by Better Auth | Single-use and ≤1 hour; replacing the flow is larger than Phase 2 | Before public launch / Phase 8 |
| No third-party error tracking yet | Avoid extra data processor before launch | Phase 8 |
| CSP not yet configured | No production deployment yet | Phase 8 |
