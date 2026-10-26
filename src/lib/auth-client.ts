import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. It talks to /api/auth on the same origin, so no base URL
 * is needed and no secret is exposed.
 */
export const authClient = createAuthClient();
