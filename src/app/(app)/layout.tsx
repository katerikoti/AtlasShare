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
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 sm:px-10">
          <Link
            href="/map"
            className="flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full bg-moss font-display text-base text-canvas"
            >
              A
            </span>
            <span className="hidden font-display text-lg tracking-tight sm:inline">
              {brand.name}
            </span>
          </Link>
          <nav
            aria-label="Main"
            className="order-last flex w-full items-center gap-1 sm:order-none sm:ml-2 sm:w-auto"
          >
            <Link
              href="/map"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas/70 hover:text-ink"
            >
              Map
            </Link>
            <Link
              href="/shared"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas/70 hover:text-ink"
            >
              Shared
            </Link>
            <Link
              href="/account"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas/70 hover:text-ink"
            >
              Account
            </Link>
          </nav>
          <span className="hidden text-sm text-ink-muted lg:inline">
            Signed in as {session.user.name}
          </span>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:px-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-line/80">
        <p className="mx-auto w-full max-w-4xl px-6 py-4 text-xs text-ink-muted sm:px-10">
          Private by default · Country-level travel maps.
        </p>
      </footer>
    </div>
  );
}
