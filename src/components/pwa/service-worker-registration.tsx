"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Register the generated service worker and offer an explicit update path.
 *
 * The worker never activates a replacement while the user is working, so an
 * open tab cannot silently change its cache policy. When a replacement is
 * ready, the user sees a small prompt and can refresh when convenient.
 */
export function ServiceWorkerRegistration() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloadRequested = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // A production worker left behind on localhost can serve stale assets in
      // development. Remove it; this does not touch cache storage.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister()),
          ),
        )
        .catch(() => {});
      return;
    }

    let cancelled = false;
    let removeVisibilityListener: (() => void) | undefined;
    let lastUpdateCheck = Date.now();

    function onControllerChange() {
      if (reloadRequested.current) {
        window.location.reload();
      }
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (cancelled) return;

        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaiting(installing);
            }
          });
        });

        function checkForUpdate() {
          if (document.visibilityState !== "visible") return;
          const now = Date.now();
          if (now - lastUpdateCheck < 60 * 60 * 1000) return;
          lastUpdateCheck = now;
          registration.update().catch(() => {});
        }

        document.addEventListener("visibilitychange", checkForUpdate);
        removeVisibilityListener = () =>
          document.removeEventListener("visibilitychange", checkForUpdate);
      })
      .catch(() => {
        // Registration is an enhancement. The app continues without it.
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      removeVisibilityListener?.();
    };
  }, []);

  if (!waiting) return null;

  function applyUpdate() {
    if (!waiting) return;
    reloadRequested.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
    setWaiting(null);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-moss/30 bg-surface p-4 shadow-soft sm:inset-x-auto sm:right-6">
      <p role="status" className="text-sm leading-relaxed text-ink">
        A newer version is ready. Refresh when you are at a convenient point.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyUpdate}
          className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-ink"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setWaiting(null)}
          className="rounded-full px-3 py-2 text-sm font-medium text-moss transition-colors hover:bg-canvas/70"
        >
          Later
        </button>
      </div>
    </div>
  );
}
