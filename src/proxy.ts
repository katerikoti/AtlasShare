import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic navigation only.
 *
 * This checks whether a session cookie is present so signed-out users do not
 * see a flash of the app shell. It is NOT the authorization boundary: every
 * private page and action re-checks the session and ownership on the server.
 *
 * Auth pages are intentionally not redirected when a cookie is present. A
 * password change rotates the session cookie, and a cookie-presence redirect
 * from /sign-in back to /account can race that rotation into a redirect loop.
 * Letting a signed-in user see the sign-in form is harmless.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (!hasSessionCookie && pathname.startsWith("/account")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
