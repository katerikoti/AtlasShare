import { renderServiceWorker } from "@/lib/service-worker";

export const dynamic = "force-static";

/**
 * Generated service worker. Keeping it in TypeScript lets the cache policy be
 * tested; the response is still a plain classic worker script at `/sw.js`.
 */
export function GET() {
  return new Response(renderServiceWorker(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
