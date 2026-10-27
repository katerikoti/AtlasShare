import Link from "next/link";

import { brand } from "@/config/brand";

/**
 * Public landing page.
 *
 * Introduces the product and provides the routes into sign-in and sign-up.
 */
export default function Home() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden px-6 pb-8 pt-6 sm:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% -10%, rgb(220 161 161 / 0.28), transparent 60%), radial-gradient(50rem 35rem at 95% 110%, rgb(102 115 97 / 0.18), transparent 65%)",
        }}
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 border-b border-line/80 pb-5 sm:gap-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-moss font-display text-base text-canvas sm:size-9 sm:text-lg"
          >
            A
          </span>
          <span className="truncate font-display text-xl tracking-tight sm:text-2xl">
            {brand.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-moss px-3 py-2 text-sm font-medium text-canvas transition-colors hover:bg-ink sm:px-4"
          >
            Create account
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss">
            A shared travel atlas
          </p>
          <h1 className="mt-5 max-w-xl font-display text-5xl leading-[0.98] tracking-tight text-balance sm:text-6xl lg:text-7xl">
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
        </div>

        <div className="relative">
          <div className="mx-auto max-w-xl rotate-1 rounded-card border border-line/80 bg-surface p-4 shadow-soft sm:p-6">
            <div className="overflow-hidden rounded-[1.4rem] border border-line/70 bg-map">
              <svg
                viewBox="0 0 640 420"
                role="img"
                aria-label={`Decorative abstract map illustration for ${brand.name}`}
                className="h-auto w-full"
              >
                <defs>
                  <pattern
                    id="atlas-dots"
                    width="18"
                    height="18"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="2" cy="2" r="1" fill="#667361" opacity="0.18" />
                  </pattern>
                </defs>
                <rect width="640" height="420" fill="#F1ECE6" />
                <rect width="640" height="420" fill="url(#atlas-dots)" />
                {[70, 140, 210, 280, 350].map((y) => (
                  <path
                    key={y}
                    d={`M 30 ${y} C 190 ${y - 38}, 450 ${y + 38}, 610 ${y}`}
                    fill="none"
                    stroke="#667361"
                    strokeOpacity="0.28"
                    strokeWidth="1"
                  />
                ))}
                {[100, 190, 280, 370, 460, 550].map((x) => (
                  <path
                    key={x}
                    d={`M ${x} 30 C ${x - 28} 140, ${x + 28} 280, ${x} 390`}
                    fill="none"
                    stroke="#667361"
                    strokeOpacity="0.18"
                    strokeWidth="1"
                  />
                ))}
                <g fill="#DCA1A1" stroke="#E9E3DD" strokeWidth="2">
                  <circle cx="196" cy="152" r="9" />
                  <circle cx="292" cy="118" r="5.5" />
                  <circle cx="352" cy="204" r="7" />
                  <circle cx="438" cy="164" r="5.5" />
                  <circle cx="474" cy="274" r="8" />
                  <circle cx="248" cy="286" r="4.5" />
                </g>
                <g
                  fill="none"
                  stroke="#667361"
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                >
                  <path d="M196 152 Q 250 96 292 118" />
                  <path d="M292 118 Q 326 150 352 204" />
                  <path d="M352 204 Q 402 162 438 164" />
                  <path d="M438 164 Q 474 210 474 274" />
                  <path d="M196 152 Q 210 230 248 286" />
                </g>
              </svg>
            </div>
            <div className="flex items-center justify-between px-2 pb-1 pt-4 text-xs text-ink-muted">
              <span>Country-level and private by default</span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-rose"
                />
                Visited
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-line/80 pt-5 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Private by default · Country-level travel maps.</p>
        <a
          className="font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink"
          href={brand.repositoryUrl}
          rel="noreferrer"
        >
          View the repository
        </a>
      </footer>
    </main>
  );
}
