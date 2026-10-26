/**
 * Generation-only auth config for the Better Auth CLI.
 *
 * The app creates its auth instance lazily (src/server/auth.ts) so `next build`
 * does not need runtime secrets. The CLI, however, requires a module-level
 * `auth` export. This file exists only for:
 *
 *   npm run db:auth-schema
 *
 * It is never imported by the application.
 */
import "dotenv/config";

import { betterAuth } from "better-auth";

import { createAuthOptions } from "../src/server/auth";

export const auth = betterAuth(createAuthOptions());
