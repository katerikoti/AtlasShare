import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

import { brand } from "@/config/brand";

/**
 * Shared chrome for the public pages. Signed-in visitors are redirected from
 * the landing page in `page.tsx`; the privacy page remains available to both
 * signed-in and signed-out readers.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% -10%, rgb(220 161 161 / 0.28), transparent 60%), radial-gradient(50rem 35rem at 95% 110%, rgb(90 102 85 / 0.18), transparent 65%)",
        }}
      />

      <a
        href="#main"
        className="sr-only rounded-full bg-moss px-4 py-2 text-sm font-semibold text-canvas focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 border-b border-line/80 px-6 py-5 sm:px-10 sm:py-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss sm:gap-3"
        >
          <Image
            src="/brand/atlas-share-mark-transparent.png"
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            className="size-8 shrink-0 object-contain sm:size-9"
          />
          <span className="truncate font-display text-xl tracking-tight sm:text-2xl">
            {brand.name}
          </span>
        </Link>

        <nav
          aria-label="Public"
          className="flex shrink-0 items-center gap-2 sm:gap-3"
        >
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="hidden text-sm font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink sm:inline"
          >
            Create account
          </Link>
          <Link
            href="/install"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-rose-deep px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-rose sm:px-4"
          >
            Install
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-4 border-t border-line/80 px-6 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-10">
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
    </div>
  );
}
