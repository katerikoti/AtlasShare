import { renderOfflinePage } from "@/lib/offline-page";

export const dynamic = "force-static";

/**
 * A standalone offline document for the service worker.
 *
 * It is intentionally a route handler instead of a page so it has no Next.js
 * runtime chunks and can be read from the install-time cache without a network
 * connection.
 */
export function GET() {
  return new Response(renderOfflinePage(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
