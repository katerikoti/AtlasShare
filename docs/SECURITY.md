# AtlasShare — Security

Status: **policy for the whole project; nothing beyond the Phase 1 foundation is
implemented yet.** This document states the rules that every phase must satisfy.
Deviations require an explicit decision in `DECISIONS.md`.

## 1. Assets

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| Account credentials and sessions | Account takeover exposes all travel data | Better Auth tables, cookies |
| A user's visited countries, notes, dates | Personal travel history; can reveal habits | `visited_countries` |
| Shared map membership and invitations | Unauthorized access to other people's data | `shared_maps*` tables |
| Email addresses | PII, phishing/spam target | `user.email`, invitation email |
| Secrets (DB URL, auth secret, Resend key) | Full compromise | Environment variables only |
| Invitation tokens | Grant access to a shared map | Emailed/copied link; hash in DB |

Explicit non-assets: there is no payment data, no precise location, no address
book, and no third-party analytics profile.

## 2. Trust boundaries

```
untrusted: browser, URL, form fields, headers, invitation links, uploaded/imported data (future)
──────────────────────────────────────────────────────────────────────────────
trusted:   Next.js server runtime, Server Actions, route handlers, Prisma, Neon
──────────────────────────────────────────────────────────────────────────────
external:  Resend (receives email address + message content only)
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
  plaintext passwords. Minimum length 8–12 (final value set in Phase 2) and a
  breached-password check if it can be done without shipping a huge list.
- Sessions: HTTP-only, `Secure` in production, `SameSite=Lax`, path `/`,
  reasonable lifetime (e.g. 30 days) with rolling refresh.
- Sign-out invalidates the server session, not just the cookie.
- **Email verification is not enforced initially.** Accepted risk: typo'd or
  fake addresses. Mitigations: password reset and invitations prove control of
  the address; a verified-email requirement can be enabled later without a
  schema change. Revisit before public launch.
- Password reset uses Better Auth's verification flow with single-use,
  time-limited tokens. The response is identical whether or not the email
  exists (no account enumeration).
- Sign-in and sign-up errors are generic: "Email or password is incorrect."

## 4. Authorization

The single most important rule: **every query that touches private data is
scoped by the authenticated user or by a verified membership.**

- Personal visits: `where: { userId: session.user.id }`. There is no endpoint
  that accepts a `userId` from the client.
- Shared maps: a `requireMapAccess(mapId, userId)` helper returns the map +
  membership or throws a not-found response. All member/invitation mutations go
  through it.
- Owner-only actions (rename, delete, invite, revoke, remove member) check
  `role === "OWNER"` server-side.
- Authorization failures for private maps return **404**, not 403, so the
  existence of a map is not disclosed to non-members.
- Removing a member or revoking an invite takes effect immediately on the next
  request. No cached member lists.
- The combined map view is computed server-side and returns aggregates. Raw
  per-member notes/dates are never sent to another member.

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
  ≤ 80 chars, description ≤ 280, note ≤ 280, email ≤ 320.
- Emails: normalize to lowercase + trim; validate with a conservative pattern
  and let the email provider reject the rest.
- Reject unexpected fields rather than ignoring them silently for security-
  relevant actions.
- File uploads/imports are out of scope. If added, they need type sniffing, size
  limits, and never-serve-as-HTML handling.

## 6. Output handling

- React escapes text by default. `dangerouslySetInnerHTML` is prohibited except
  for a static, reviewed string (none planned).
- User-provided text (map name, note) is rendered as text, never as markup.
- URLs derived from user input are not allowed. Invitation links are built from
  `NEXT_PUBLIC_APP_URL` + a server-generated token.
- The SVG map only renders dataset-controlled path data. If a future feature
  lets users import geometry, it must be sanitized and never injected raw.

## 7. CSRF and request forgery

- Better Auth validates origins for its endpoints.
- Server Actions are same-origin POSTs with Next.js's built-in action checks;
  still treat the payload as untrusted.
- Cookies are `SameSite=Lax`, which blocks cross-site POSTs from carrying the
  session for top-level navigations.
- No state-changing GET requests.
- Invitation acceptance is a POST that requires the signed-in user's email to
  match the invitation email, so a forwarded link cannot be redeemed by a
  different account.

## 8. Invitation tokens

- Generate 32 random bytes (base64url) with a CSPRNG.
- Store only `SHA-256(token)` in `tokenHash`. The raw token exists only in the
  email/link.
- Single use: acceptance stamps `acceptedAt` atomically; a second attempt fails.
- Expiry: 7 days. Revocable by the owner. Expired/revoked tokens are rejected
  with the same generic message as invalid ones.
- Rate-limit acceptance attempts per IP and per account.
- Do not put tokens in logs, analytics, Referer-leaking URLs on other origins,
  or error messages. The invite page sets `Referrer-Policy: no-referrer`.
- Invitations are per-email. Copyable links still target one address. Changing
  the invitation email requires revoking and re-inviting.

## 9. Rate limiting and abuse

Phase 2 baseline (Better Auth built-in where possible):

| Action | Limit (starting point) |
| --- | --- |
| Sign-in attempts | 5 per email + IP per 15 min |
| Sign-up | 5 per IP per hour |
| Password reset request | 3 per email per hour |
| Invitation send | 20 per map per day |
| Invitation accept | 10 per IP per hour |
| Visit toggle | generous, but bounded per user per minute |

Storage decision deferred: database vs. per-instance memory. On serverless,
per-instance memory is only a speed bump; if we need real limits, use a shared
store. Record the decision in Phase 2.

## 10. Secrets and configuration

- Secrets only in environment variables; never in the repo, never `NEXT_PUBLIC_*`.
- `.env*` is gitignored; `.env.example` contains placeholders only.
- Rotate the auth secret / Resend key if leaked. Rotating `BETTER_AUTH_SECRET`
  invalidates sessions (acceptable).
- Separate Neon branches/databases per environment. Preview deployments must not
  use the production database.
- The Resend API key is server-only; emails are sent from server code.
- Do not print env values in build logs or error pages.

## 11. Transport and headers

Production (Phase 8):

- HTTPS only; HSTS with a long max-age after the domain is stable.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` (invite pages:
  `no-referrer`)
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

- Rendered from the signed-in user's own data only. The export component takes
  an explicit, minimal input: display name (optional), visit set, count, map
  year. It must not receive shared-map member data or account metadata.
- No remote images/fonts (prevents canvas tainting and data exfiltration).
- No tokens, emails, or ids embedded in PNG metadata. Canvas output has none by
  default; do not add custom metadata.
- The export runs locally in the browser; no server-side headless browser.

## 14. Email

- Plain HTML with inline styles, no remote tracking pixels, no open tracking.
- Links are absolute and built from the configured app URL.
- Never include passwords, tokens other than the intended single-use link, or
  other users' email addresses.
- Resend receives the recipient address and message body. That is the only data
  processor besides Neon/Vercel.
- Bounce/complaint handling: Resend dashboard for now; a suppression list is a
  later concern.

## 15. Logging and monitoring

- Log security-relevant events without PII: sign-in failure counts, invitation
  accepted/revoked (ids only), authorization denials.
- Never log passwords, session tokens, invitation tokens, full email bodies, or
  full connection strings.
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
  codes, optional note/date, map membership.
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
| Email verification not enforced | Friction at sign-up; reset/invite flows still prove address control | Before public launch / Phase 8 |
| No MFA | Scope; password + rate limiting first | Post-launch |
| Per-instance rate limiting may be weak on serverless | Simplicity; limits still slow brute force | Phase 2 decision |
| No third-party error tracking yet | Avoid extra data processor before launch | Phase 8 |
| CSP not yet configured | No production deployment yet | Phase 8 |
