"use client";

import { secondaryButtonClass } from "@/components/ui/form";

export default function MapError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-card border border-rose-deep/40 bg-rose/15 p-6 shadow-soft sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
        Your map
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">
        We could not load your map.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
        Your saved countries are still private to your account. Try again; if
        the problem continues, sign out and back in.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className={`${secondaryButtonClass} mt-5`}
      >
        Try again
      </button>
    </section>
  );
}
