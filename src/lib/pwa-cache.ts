import { SW_RUNTIME_CACHE_PREFIX } from "@/lib/service-worker";

export type CacheClearResult = { cleared: number };

/**
 * Clear runtime caches on sign-out as defence in depth.
 *
 * The service worker only caches public static assets, but clearing the
 * runtime cache means a shared device cannot replay anything from the previous
 * session. The offline shell remains available; it contains no private data.
 */
export async function clearPrivateRuntimeCaches(): Promise<CacheClearResult> {
  if (typeof window === "undefined") return { cleared: 0 };

  let cleared = 0;
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      const targets = keys.filter((key) =>
        key.startsWith(SW_RUNTIME_CACHE_PREFIX),
      );
      await Promise.all(targets.map((key) => caches.delete(key)));
      cleared = targets.length;
    }
  } catch {
    // Cache storage can be unavailable in private modes. Signing out must not
    // fail because of cleanup.
  }

  try {
    navigator.serviceWorker?.controller?.postMessage({
      type: "CLEAR_RUNTIME_CACHES",
    });
  } catch {
    // No controller is normal on a first visit or unsupported browser.
  }

  return { cleared };
}
