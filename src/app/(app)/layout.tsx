import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DesktopNav, MobileTabBar } from "@/components/app/app-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { brand } from "@/config/brand";
import { requireSession } from "@/server/session";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// Every page under this layout is authenticated and request-specific. Force
// dynamic rendering so `next build` never tries to prerender it (which would
// require runtime database/auth secrets during the build).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4rem+max(env(safe-area-inset-bottom),0px))] sm:pb-0">
      <header className="border-b border-line/80 bg-canvas/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-x-4 px-6 py-3 sm:px-10 sm:py-4">
          <Link
            href="/map"
            className="flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss"
          >
            <Image
              src="/brand/atlas-share-mark-transparent.png"
              alt=""
              aria-hidden="true"
              width={36}
              height={36}
              className="size-8 shrink-0 object-contain"
            />
            <span className="font-display text-lg tracking-tight">
              {brand.name}
            </span>
          </Link>
          <DesktopNav />
          <div className="ml-auto">
            <SignOutButton iconOnlyOnMobile />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:px-10 sm:py-14">
        {children}
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-4 border-t border-line/80 px-6 py-6 text-sm text-ink-muted max-sm:hidden sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <p>
          © {brand.name} {new Date().getFullYear()}
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <a
            href={brand.portfolioUrl}
            rel="noreferrer"
            className="font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink"
          >
            Made by Katerina Mäenpää
          </a>
          <Link
            href="/privacy"
            className="font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink"
          >
            Privacy
          </Link>
          <Link
            href="/privacy#map-data"
            className="font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink"
          >
            Map data
          </Link>
        </nav>
      </footer>

      <MobileTabBar />
    </div>
  );
}
