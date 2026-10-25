<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## AtlasShare project rules

Read these before changing code:

1. `docs/PROGRESS.md` — current phase, decisions, blockers, and next steps.
2. `docs/DEVELOPMENT_PLAN.md` — phase scope and acceptance criteria.
3. `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DATABASE.md` — constraints.

Working rules:

- Work only inside the approved phase. Do not implement later phases early.
- Stop at the end of a phase and wait for explicit approval.
- Update the relevant docs (especially `PROGRESS.md`) before finishing.
- Run `npm run check` and `npm run build`; report actual results honestly.
- Never commit `.env` files, secrets, real credentials, or invitation tokens.
- Use `brand` from `src/config/brand.ts`; do not hard-code the product name.
- Store country identifiers as ISO 3166-1 alpha-2 codes (plus the explicitly
  documented exception) and keep the country dataset as the single definition.
- Keep authorization checks on the server. Hiding UI is not security.
- Do not cache authenticated data or private API responses in the service worker.
- The image export must contain only the signed-in user's map, never shared-map
  members' histories or private account metadata.

