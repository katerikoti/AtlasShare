import Link from "next/link";
import type { ReactNode } from "react";

import { brand } from "@/config/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden px-6 py-8 sm:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(45rem 32rem at 12% -10%, rgb(220 161 161 / 0.25), transparent 60%), radial-gradient(40rem 30rem at 100% 110%, rgb(102 115 97 / 0.16), transparent 65%)",
        }}
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full bg-moss font-display text-lg text-canvas"
          >
            A
          </span>
          <span className="font-display text-xl tracking-tight">
            {brand.name}
          </span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 items-center py-12">
        <div className="w-full rounded-card border border-line/80 bg-surface/90 p-7 shadow-soft backdrop-blur-sm sm:p-10">
          {children}
        </div>
      </div>

      <footer className="mx-auto w-full max-w-5xl text-center text-xs text-ink-muted">
        Country-level travel only. No location tracking, no public profiles.
      </footer>
    </main>
  );
}
