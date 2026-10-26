"use server";

import { isCountryCode } from "@/data/countries";
import { requireSession } from "@/server/session";
import { setVisitedCountryForUser } from "@/server/visits";
import type { VisitedCountryActionState } from "./types";

/**
 * Set one country's visited state for the signed-in user.
 *
 * The country code is validated against the committed dataset on the server,
 * and the user id comes from the session. The client sends the desired state
 * (not a blind toggle) so retries and rapid clicks are idempotent.
 */
export async function setVisitedCountryAction(
  countryCode: unknown,
  visited: unknown,
): Promise<VisitedCountryActionState> {
  const session = await requireSession();

  if (typeof countryCode !== "string" || !isCountryCode(countryCode)) {
    return { ok: false, message: "That country is not in the map dataset." };
  }
  if (typeof visited !== "boolean") {
    return { ok: false, message: "The requested map update was invalid." };
  }

  try {
    await setVisitedCountryForUser({
      userId: session.user.id,
      countryCode,
      visited,
    });
    return { ok: true, visited };
  } catch (error) {
    console.error("[visits] update failed", {
      userId: session.user.id,
      countryCode,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return {
      ok: false,
      message: "Could not save your map. Check your connection and try again.",
    };
  }
}
