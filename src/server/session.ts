import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAuth } from "./auth";

/**
 * Read the current session on the server.
 *
 * `cache` deduplicates the call within a single request (layout + page).
 * A missing session is not an error here — callers decide what to do.
 */
export const getSession = cache(async () => {
  return getAuth().api.getSession({ headers: await headers() });
});

/**
 * The authorization gate for signed-in pages and server actions.
 *
 * This is the real check. The proxy may redirect earlier for UX, but it is not
 * trusted for access control.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}
