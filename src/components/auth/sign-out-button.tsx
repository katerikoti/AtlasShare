"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { secondaryButtonClass } from "@/components/ui/form";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    await authClient.signOut();
    router.replace("/");
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
