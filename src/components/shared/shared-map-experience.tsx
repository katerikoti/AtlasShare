"use client";

import { useId, useMemo, useState } from "react";

import {
  countriesAlphabetical,
  countryCount,
  getCountry,
  type CountryCode,
} from "@/data/countries";
import { secondaryButtonClass } from "@/components/ui/form";
import type { SharedMapView } from "@/server/shared-maps";
import { MapAttribution } from "@/components/map/map-attribution";
import { useMapGeometry } from "@/components/map/use-map-geometry";

type SharedMapExperienceProps = {
  map: Pick<
    SharedMapView,
    "name" | "members" | "combinedCountries" | "combinedCount"
  >;
};

type VisibleCountry = {
  code: CountryCode;
  name: string;
  count?: number;
};

export function SharedMapExperience({ map }: SharedMapExperienceProps) {
  const [selected, setSelected] = useState("everyone");
  const { geometry, error, retry } = useMapGeometry();
  const filterId = useId();
  const mapHeadingId = useId();
  const mapTitleId = useId();
  const listHeadingId = useId();

  const selectedMember = useMemo(
    () => map.members.find((member) => member.id === selected) ?? null,
    [map.members, selected],
  );
  const filterValue = selectedMember ? selected : "everyone";

  const visibleCodes = useMemo(() => {
    if (selectedMember) return new Set(selectedMember.countries);
    return new Set(map.combinedCountries.map((country) => country.code));
  }, [map.combinedCountries, selectedMember]);

  const visibleCountries = useMemo<VisibleCountry[]>(() => {
    const counts = new Map(
      map.combinedCountries.map((country) => [country.code, country.count]),
    );
    const visible: VisibleCountry[] = [];

    for (const code of visibleCodes) {
      const country = getCountry(code);
      if (!country) continue;
      visible.push({
        code,
        name: country.name,
        count: selectedMember ? undefined : counts.get(code),
      });
    }

    return visible.sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
  }, [map.combinedCountries, selectedMember, visibleCodes]);

  const visibleCount = visibleCountries.length;
  const percent =
    Math.round((visibleCount / countryCount) * 1000) / 10;
  const viewLabel = selectedMember
    ? `${selectedMember.name}${selectedMember.isCurrentUser ? " (you)" : ""}`
    : "everyone";

  return (
    <div className="space-y-5">
      <section
        aria-labelledby={mapHeadingId}
        className="min-w-0 rounded-card border border-line/80 bg-surface/80 p-4 shadow-soft sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id={mapHeadingId}
              className="font-display text-2xl tracking-tight"
            >
              Combined map
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Countries marked by any member. Use the filter to see one
              person&apos;s map at a time.
            </p>
          </div>
          <div className="min-w-52">
            <label
              htmlFor={filterId}
              className="block text-xs font-semibold uppercase tracking-[0.16em] text-moss"
            >
              Show
            </label>
            <select
              id={filterId}
              value={filterValue}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas/60 px-3 py-2 text-sm text-ink shadow-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
            >
              <option value="everyone">
                Everyone · {map.combinedCount} marked
              </option>
              {map.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {member.isCurrentUser ? " (you)" : ""} · {member.count} marked
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-y border-line/70 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
              {selectedMember ? "One member" : "Combined progress"}
            </p>
            <p className="mt-1 font-display text-3xl tracking-tight">
              <span aria-live="polite">{visibleCount}</span> of {countryCount}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              countries &amp; territories marked by {viewLabel}
            </p>
          </div>
          <p className="text-sm font-medium text-moss">
            {percent.toLocaleString("en", { maximumFractionDigits: 1 })}% of the
            world
          </p>
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
                World map showing countries marked by {viewLabel}.
              </title>
              {countriesAlphabetical.map((country) => {
                const visited = visibleCodes.has(country.code);
                const combinedCount =
                  map.combinedCountries.find(
                    (entry) => entry.code === country.code,
                  )?.count ?? 0;

                return (
                  <path
                    key={country.code}
                    d={geometry.paths[country.code]}
                    data-country={country.code}
                    data-visited={visited}
                    className="map-country map-country-readonly"
                  >
                    <title>
                      {country.name} —{" "}
                      {visited
                        ? selectedMember
                          ? `marked by ${selectedMember.name}`
                          : `marked by ${combinedCount} of ${map.members.length} ${
                            map.members.length === 1 ? "member" : "members"
                          }`
                        : "not marked"}
                    </title>
                  </path>
                );
              })}
            </svg>
          ) : error ? (
            <div
              role="alert"
              className="absolute inset-0 grid place-items-center p-6 text-center"
            >
              <div>
                <p className="text-sm text-ink-muted">{error}</p>
                <button
                  type="button"
                  onClick={retry}
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
            Marked
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-full border border-moss bg-map"
            />
            Not marked
          </span>
          <span>
            {selectedMember
              ? "This view shows one member's country-level marks."
              : "A country is marked when at least one member has visited it."}
          </span>
        </div>
      </section>

      <section
        aria-labelledby={listHeadingId}
        className="rounded-card border border-line/80 bg-surface/80 p-5 shadow-soft sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id={listHeadingId}
            className="font-display text-xl tracking-tight"
          >
            Countries in this view
          </h3>
          <p className="text-xs text-ink-muted" aria-live="polite">
            {visibleCount} of {countryCount} marked
          </p>
        </div>

        {visibleCountries.length === 0 ? (
          <p className="mt-4 rounded-xl border border-line/70 bg-canvas/50 px-4 py-3 text-sm text-ink-muted">
            {selectedMember
              ? `${selectedMember.name} has not marked any countries yet.`
              : "No one in this map has marked a country yet."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {visibleCountries.map((country) => (
              <li
                key={country.code}
                className="flex items-center justify-between gap-3 rounded-xl bg-canvas/45 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">
                    {country.name}
                  </span>
                  <span className="block text-[11px] text-ink-muted">
                    {country.code}
                  </span>
                </span>
                {country.count !== undefined ? (
                  <span className="shrink-0 text-[11px] text-ink-muted">
                    {country.count} of {map.members.length}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Members can see each other&apos;s names and country-level marks. Email
          addresses, account details, notes, and visit dates are not shared.
        </p>
      </section>

      <MapAttribution />
    </div>
  );
}
