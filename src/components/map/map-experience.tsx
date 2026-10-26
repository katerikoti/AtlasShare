"use client";

import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import {
  countriesAlphabetical,
  countryCount,
  type CountryCode,
} from "@/data/countries";
import { setVisitedCountryAction } from "@/server/actions/visits";
import { inputClass, secondaryButtonClass } from "@/components/ui/form";

type MapGeometry = {
  viewBox: string;
  paths: Record<string, string>;
};

type MapExperienceProps = {
  initialVisited: CountryCode[];
};

const mapErrorMessage = "The map could not load. Check your connection and try again.";
const saveErrorMessage =
  "Your change was not saved. Check your connection and try again.";

export function MapExperience({ initialVisited }: MapExperienceProps) {
  const [visited, setVisited] = useState(() => new Set(initialVisited));
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<MapGeometry | null>(null);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [geometryAttempt, setGeometryAttempt] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const searchId = useId();
  const mapTitleId = useId();

  useEffect(() => {
    const controller = new AbortController();

    fetch("/map/countries.json", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Map request failed with ${response.status}`);
        }
        const data = (await response.json()) as Partial<MapGeometry>;
        if (
          typeof data.viewBox !== "string" ||
          !data.paths ||
          typeof data.paths !== "object"
        ) {
          throw new Error("Map data is missing a viewBox or paths");
        }
        const missing = countriesAlphabetical.filter(
          (country) => typeof data.paths?.[country.code] !== "string",
        );
        if (missing.length > 0) {
          throw new Error(`Map data is missing ${missing.length} countries`);
        }
        setGeometry(data as MapGeometry);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setGeometryError(mapErrorMessage);
      });

    return () => controller.abort();
  }, [geometryAttempt]);

  const filteredCountries = useMemo(() => {
    const term = deferredQuery.trim().toLocaleLowerCase("en");
    if (!term) return countriesAlphabetical;

    return countriesAlphabetical.filter((country) => {
      const haystack = `${country.name} ${country.code}`
        .toLocaleLowerCase("en")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      return haystack.includes(
        term.normalize("NFD").replace(/\p{Diacritic}/gu, ""),
      );
    });
  }, [deferredQuery]);

  const visitedCount = visited.size;
  const percent = Math.round((visitedCount / countryCount) * 1000) / 10;
  const hoveredCountry = hovered
    ? countriesAlphabetical.find((country) => country.code === hovered)
    : undefined;

  async function toggleCountry(code: CountryCode) {
    if (pending.has(code)) return;

    const wasVisited = visited.has(code);
    const nextVisited = !wasVisited;

    setActionError(null);
    setVisited((current) => {
      const next = new Set(current);
      if (nextVisited) next.add(code);
      else next.delete(code);
      return next;
    });
    setPending((current) => new Set(current).add(code));

    try {
      const result = await setVisitedCountryAction(code, nextVisited);
      if (!result.ok) {
        setVisited((current) => {
          const next = new Set(current);
          if (wasVisited) next.add(code);
          else next.delete(code);
          return next;
        });
        setActionError(result.message || saveErrorMessage);
        return;
      }

      // A successful result confirms the optimistic state. Keep it in place;
      // the next page load re-reads the persisted set from the server.
    } catch {
      setVisited((current) => {
        const next = new Set(current);
        if (wasVisited) next.add(code);
        else next.delete(code);
        return next;
      });
      setActionError(saveErrorMessage);
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(code);
        return next;
      });
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Your map
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          Where have you been?
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
          Mark the countries and territories you have visited. Your map is
          private to your account.
        </p>
      </header>

      <section
        aria-labelledby="map-count-heading"
        className="rounded-card border border-line/80 bg-surface/80 p-5 shadow-soft sm:p-6"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2
              id="map-count-heading"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-moss"
            >
              Your progress
            </h2>
            <p className="mt-2 font-display text-4xl tracking-tight">
              <span aria-live="polite">{visitedCount}</span> of {countryCount}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              countries &amp; territories marked
            </p>
          </div>
          <p className="text-sm font-medium text-moss">
            {percent.toLocaleString("en", { maximumFractionDigits: 1 })}% of the
            world
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Countries marked visited"
          aria-valuemin={0}
          aria-valuemax={countryCount}
          aria-valuenow={visitedCount}
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-line/70"
        >
          <div
            className="h-full rounded-full bg-rose-deep transition-[width] duration-300"
            style={{ width: `${(visitedCount / countryCount) * 100}%` }}
          />
        </div>
      </section>

      {actionError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-2xl border border-rose-deep/40 bg-rose/25 px-4 py-3 text-sm text-ink"
        >
          <p>{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-moss hover:bg-canvas/70"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {visitedCount === 0 ? (
        <div className="rounded-2xl border border-moss/25 bg-moss/10 px-4 py-3 text-sm leading-relaxed text-ink">
          <span className="font-medium">Your map is empty.</span> Pick your
          first country on the map or in the country list.
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <section
          aria-labelledby="map-heading"
          className="min-w-0 rounded-card border border-line/80 bg-surface/80 p-4 shadow-soft sm:p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="map-heading" className="font-display text-2xl tracking-tight">
                Your world
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Tap or click a country to mark or unmark it.
              </p>
            </div>
            {hoveredCountry ? (
              <p className="rounded-full bg-canvas/80 px-3 py-1 text-xs font-medium text-ink">
                {hoveredCountry.name} ·{" "}
                {visited.has(hoveredCountry.code) ? "visited" : "not visited"}
              </p>
            ) : null}
          </div>

          <div className="relative mt-4 aspect-[1010/760] w-full overflow-hidden rounded-2xl border border-line/70 bg-map">
            {geometry ? (
              <svg
                viewBox={geometry.viewBox}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-labelledby={mapTitleId}
                className="h-full w-full"
              >
                <title id={mapTitleId}>
                  World map. Mark countries with the map or the country list.
                </title>
                {countriesAlphabetical.map((country) => (
                  <path
                    key={country.code}
                    d={geometry.paths[country.code]}
                    data-country={country.code}
                    data-visited={visited.has(country.code)}
                    className="map-country"
                    onClick={() => void toggleCountry(country.code)}
                    onPointerEnter={() => setHovered(country.code)}
                    onPointerLeave={() =>
                      setHovered((current) =>
                        current === country.code ? null : current,
                      )
                    }
                  >
                    <title>
                      {country.name} —{" "}
                      {visited.has(country.code) ? "visited" : "not visited"}
                    </title>
                  </path>
                ))}
              </svg>
            ) : geometryError ? (
              <div
                role="alert"
                className="absolute inset-0 grid place-items-center p-6 text-center"
              >
                <div>
                  <p className="text-sm text-ink-muted">{geometryError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setGeometry(null);
                      setGeometryError(null);
                      setGeometryAttempt((attempt) => attempt + 1);
                    }}
                    className={`${secondaryButtonClass} mt-3`}
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <div
                aria-busy="true"
                className="absolute inset-0 grid place-items-center bg-map"
              >
                <p className="text-sm text-ink-muted">Loading the map…</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-full border border-moss bg-rose"
              />
              Visited
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-full border border-moss bg-map"
              />
              Not visited
            </span>
            <span>Borders use moss; visited countries use dusty rose.</span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            The map is a visual aid. The country list is the keyboard- and
            screen-reader-friendly way to change your map.
          </p>
        </section>

        <section
          aria-labelledby="country-list-heading"
          className="order-first min-w-0 rounded-card border border-line/80 bg-surface/80 p-4 shadow-soft sm:p-5 lg:order-none lg:sticky lg:top-6"
        >
          <div>
            <h2
              id="country-list-heading"
              className="font-display text-xl tracking-tight"
            >
              Countries &amp; territories
            </h2>
            <label
              htmlFor={searchId}
              className="mt-3 block text-sm font-medium text-ink"
            >
              Find a country
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or code"
              className={`${inputClass} mt-1.5 py-2.5`}
            />
          </div>

          <p className="mt-3 text-xs text-ink-muted" aria-live="polite">
            Showing {filteredCountries.length} of {countryCount}
          </p>

          {filteredCountries.length === 0 ? (
            <p className="mt-4 rounded-xl border border-line/70 bg-canvas/50 px-3 py-3 text-sm text-ink-muted">
              No countries match “{deferredQuery}”.
            </p>
          ) : (
            <ul
              aria-label="Countries and territories"
              className="mt-3 max-h-[24rem] space-y-1 overflow-y-auto overscroll-contain pr-1 lg:max-h-[30rem]"
            >
              {filteredCountries.map((country) => {
                const isVisited = visited.has(country.code);
                const isPending = pending.has(country.code);

                return (
                  <li key={country.code}>
                    <label
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-moss ${
                        isVisited
                          ? "bg-rose/25"
                          : "hover:bg-canvas/60"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {country.name}
                        </span>
                        <span className="block text-[11px] text-ink-muted">
                          {country.code}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-ink-muted">
                          {isPending
                            ? "Saving…"
                            : isVisited
                              ? "Visited"
                              : "Not visited"}
                        </span>
                        <input
                          type="checkbox"
                          checked={isVisited}
                          disabled={isPending}
                          onChange={() => void toggleCountry(country.code)}
                          className="size-5 cursor-pointer accent-rose-deep disabled:cursor-wait"
                        />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <details className="rounded-2xl border border-line/80 bg-surface/70 px-5 py-4 text-sm leading-relaxed text-ink-muted">
        <summary className="cursor-pointer font-medium text-ink">
          About the map data
        </summary>
        <p className="mt-3">
          Country geometry is based on{" "}
          <a
            href="https://github.com/VictorCazanave/svg-maps"
            className="font-medium text-moss underline underline-offset-2"
          >
            @svg-maps/world
          </a>{" "}
          (CC BY 4.0), modified by removing non-ISO paths, merging the United
          States Minor Outlying Islands subdivisions, and adding a Natural Earth
          1:10m Antarctica outline (public domain). Palestine and Israel are
          separate map units. Boundaries follow the source data and are not a
          statement about disputed territories. Read the{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            className="font-medium text-moss underline underline-offset-2"
          >
            licence
          </a>
          .
        </p>
      </details>
    </div>
  );
}
