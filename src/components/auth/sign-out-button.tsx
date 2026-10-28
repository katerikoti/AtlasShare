"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { clearPrivateRuntimeCaches } from "@/lib/pwa-cache";
import { secondaryButtonClass } from "@/components/ui/form";

export function SignOutButton({
  redirectTo = "/",
  iconOnlyOnMobile = false,
}: {
  redirectTo?: string;
  /** Show just a log-out icon below the `sm` breakpoint (the app's top bar). */
  iconOnlyOnMobile?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      await authClient.signOut();
    } catch {
      setPending(false);
      return;
    }

    // Defence in depth: the service worker only caches public assets, but a
    // shared device should not retain anything from the signed-in session.
    await clearPrivateRuntimeCaches();
    router.replace(redirectTo);
    router.refresh();
  }

  const label = pending ? "Signing out…" : "Sign out";

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      aria-label={iconOnlyOnMobile ? "Sign out" : undefined}
      className={`${secondaryButtonClass} ${
        iconOnlyOnMobile ? "max-sm:size-10 max-sm:p-0" : ""
      }`}
    >
      {iconOnlyOnMobile ? (
        <>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            className="sm:hidden"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          <span className="max-sm:hidden">{label}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
