import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { brand } from "@/config/brand";
import { requireSession } from "@/server/session";

// Every page under this layout is authenticated and request-specific. Force
// dynamic rendering so `next build` never tries to prerender it (which would
// require runtime database/auth secrets during the build).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line/80 bg-canvas/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <div className="flex items-center gap-6">
            <Link
              href="/account"
              className="flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss"
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-moss font-display text-base text-canvas"
              >
                A
              </span>
              <span className="font-display text-lg tracking-tight">
                {brand.name}
              </span>
            </Link>
            <span className="hidden text-sm text-ink-muted sm:inline">
              Signed in as {session.user.name}
            </span>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:px-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-line/80">
        <p className="mx-auto w-full max-w-4xl px-6 py-4 text-xs text-ink-muted sm:px-10">
          Phase 2 · Accounts are live · Your map arrives in Phase 3.
        </p>
      </footer>
    </div>
  );
}
