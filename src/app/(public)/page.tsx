import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ExportMapSvg } from "@/components/export/export-map-svg";
import type { MapGeometry } from "@/components/map/use-map-geometry";
import { brand } from "@/config/brand";
import { countriesAlphabetical, type CountryCode } from "@/data/countries";
import type { ExportMapInput } from "@/lib/export-map";
import { getSession } from "@/server/session";

import mapGeometryJson from "../../../public/map/countries.json";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} — ${brand.tagline}` },
  description: brand.description,
  alternates: { canonical: "/" },
};

const sampleVisited: CountryCode[] = [
  "ES",
  "FR",
  "IT",
  "IS",
  "NO",
  "MA",
  "JP",
  "TH",
  "NZ",
  "PE",
];

const sampleExport: ExportMapInput = {
  visited: sampleVisited,
  count: sampleVisited.length,
  displayName: "Sample travels",
  year: new Date().getFullYear(),
};

const features = [
  {
    title: "Mark countries, not trips",
    body: "A country-level map with no routes, photos, live location, or trip journals. The question is simple: where have you been?",
  },
  {
    title: "Share by invitation",
    body: "Private shared maps are invite-only. Members can see country marks and names, never email addresses or account settings.",
  },
  {
    title: "Keep a copy",
    body: "Export a 3200 × 2000 PNG or an SVG. The image contains country marks and public brand information, not member identities.",
  },
  {
    title: "Install it, then go offline",
    body: "Add AtlasShare to your home screen. The app shell opens offline; your map still needs a connection to load and save.",
  },
];

const steps = [
  {
    title: "Create your private map",
    body: "Sign up with an email address and mark the countries you have visited.",
  },
  {
    title: "Invite the people you travel with",
    body: "Start a shared map and see your combined world without making anything public.",
  },
  {
    title: "Export or keep exploring",
    body: "Keep a high-resolution image, or come back whenever you add another country.",
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/map");

  const geometry = mapGeometryJson as MapGeometry;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
      <section className="grid items-center gap-14 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss">
            A shared travel atlas
          </p>
          <h1 className="mt-5 max-w-xl font-display text-[2.75rem] leading-[0.98] tracking-tight text-balance min-[480px]:text-5xl sm:text-6xl xl:text-7xl">
            Your world,{" "}
            <span className="block italic text-moss">mapped together.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">
            {brand.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex rounded-full bg-moss px-5 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-ink"
            >
              Create your account
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex rounded-full border border-moss/35 px-5 py-3 text-sm font-medium text-moss transition-colors hover:border-moss hover:bg-surface/70"
            >
              Sign in
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            <li>195 countries</li>
            <li aria-hidden="true" className="text-line">
              ·
            </li>
            <li>Private by default</li>
            <li aria-hidden="true" className="text-line">
              ·
            </li>
            <li>No location tracking</li>
          </ul>
        </div>

        <figure className="relative">
          <div className="mx-auto max-w-xl rotate-1 rounded-card border border-line/80 bg-surface p-3 shadow-soft sm:p-4">
            <div className="overflow-hidden rounded-[1.4rem] border border-line/70 bg-map">
              <ExportMapSvg
                geometry={geometry}
                input={sampleExport}
                className="h-auto w-full"
              />
            </div>
          </div>
          <figcaption className="mx-auto mt-5 max-w-xl px-1 text-xs leading-relaxed text-ink-muted">
            A sample export from the same layout you can share. It shows{" "}
            {sampleVisited.length} of {countriesAlphabetical.length} countries
            and no account details.
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="features-heading" className="py-10 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
            What it does
          </p>
          <h2
            id="features-heading"
            className="mt-4 font-display text-3xl tracking-tight sm:text-4xl"
          >
            Small on purpose. Private by design.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            AtlasShare is a country checklist and a shared map — not a trip
            tracker. That keeps the product useful without asking for more than
            it needs.
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <li
              key={feature.title}
              className="rounded-card border border-line/80 bg-surface/80 p-6 shadow-soft"
            >
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full bg-rose/45 text-sm font-semibold text-ink"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 font-display text-2xl tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="how-heading"
        className="rounded-card border border-line/80 bg-surface/65 p-6 shadow-soft sm:p-10"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
            How it works
          </p>
          <h2
            id="how-heading"
            className="mt-4 font-display text-3xl tracking-tight sm:text-4xl"
          >
            Three steps, then add countries whenever you travel.
          </h2>
        </div>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                Step {index + 1}
              </p>
              <h3 className="mt-3 font-display text-xl tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
            Privacy
          </p>
          <h2 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">
            No analytics. No public profiles. No tracking pixels.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            Your personal map is yours. Shared maps are only visible to their
            members, and the public site does not run product analytics or
            advertising scripts.
          </p>
          <Link
            href="/privacy"
            className="mt-6 inline-flex rounded-full border border-moss/35 px-4 py-2.5 text-sm font-medium text-moss transition-colors hover:border-moss hover:bg-surface/70"
          >
            Read the privacy page
          </Link>
        </div>

        <div className="rounded-card border border-moss/25 bg-moss/10 p-6 sm:p-8">
          <p className="font-display text-2xl tracking-tight">
            Start with one country.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Create a private map, then invite someone when you want to see your
            travels together.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="inline-flex rounded-full bg-moss px-5 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-ink"
            >
              Create your account
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex rounded-full border border-moss/35 px-5 py-3 text-sm font-medium text-moss transition-colors hover:border-moss hover:bg-surface/70"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
