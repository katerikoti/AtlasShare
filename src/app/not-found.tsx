import Link from "next/link";

import { brand } from "@/config/brand";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-card border border-line/80 bg-surface p-8 text-center shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          404
        </p>
        <h1 className="mt-4 font-display text-4xl tracking-tight">
          This page is off the map.
        </h1>
        <p className="mt-3 text-ink-muted">
          The page you were looking for does not exist in {brand.name}.
        </p>
        <Link
          className="mt-7 inline-flex rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-canvas transition-colors hover:bg-ink"
          href="/"
        >
          Back to the start
        </Link>
      </div>
    </main>
  );
}
