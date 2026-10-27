import type { Metadata } from "next";
import Link from "next/link";

import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Install",
  description: `Add ${brand.name} to your phone or computer as a web app.`,
  alternates: { canonical: "/install" },
};

const instructions = [
  {
    title: "iPhone or iPad",
    steps: [
      "Open AtlasShare in Safari.",
      "Tap the Share button.",
      'Choose "Add to Home Screen", then tap Add.',
    ],
  },
  {
    title: "Android phone or tablet",
    steps: [
      "Open AtlasShare in Chrome.",
      "Open the browser menu.",
      'Choose "Install app" or "Add to Home screen", then follow the prompts.',
    ],
  },
  {
    title: "Computer",
    steps: [
      "Open AtlasShare in a supported browser.",
      "Look for the install icon in the address bar, or open the browser menu.",
      'Choose "Install AtlasShare" and confirm.',
    ],
  },
];

export default function InstallPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-14 sm:px-10 sm:py-20">
      <Link
        href="/"
        className="text-sm font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink"
      >
        ← Back to home
      </Link>

      <header className="mt-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Install AtlasShare
        </p>
        <h1 className="mt-4 font-display text-4xl leading-[1.02] tracking-tight text-balance sm:text-5xl">
          Keep your map close by.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-muted">
          AtlasShare is a web app, so there is no app-store download. Add it to
          your home screen or desktop from your browser for quick access.
        </p>
      </header>

      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {instructions.map((instruction, index) => (
          <li
            key={instruction.title}
            className="rounded-card border border-line/80 bg-surface/80 p-6 shadow-soft"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-rose/45 text-sm font-semibold text-ink"
            >
              {index + 1}
            </span>
            <h2 className="mt-5 font-display text-2xl tracking-tight">
              {instruction.title}
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-ink-muted">
              {instruction.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-card border border-moss/25 bg-moss/10 p-6 text-sm leading-relaxed text-ink-muted sm:p-8">
        <p>
          Installing AtlasShare adds an icon to your device for quick access.
          You&apos;ll need an internet connection to view or save your map.
        </p>
      </div>
    </div>
  );
}
