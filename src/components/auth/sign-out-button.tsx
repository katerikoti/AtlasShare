"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { clearPrivateRuntimeCaches } from "@/lib/pwa-cache";
import { secondaryButtonClass } from "@/components/ui/form";

export function SignOutButton({ redirectTo = "/" }: { redirectTo?: string }) {
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

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className={secondaryButtonClass}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
