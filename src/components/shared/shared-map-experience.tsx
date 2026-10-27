"use client";

import { useId, useMemo, useState } from "react";

import {
  countriesAlphabetical,
  countryCount,
  getCountry,
  type CountryCode,
} from "@/data/countries";
import { getSharedComparison } from "@/data/country-insights";
import type { CountryRegion } from "@/data/country-regions";
import { secondaryButtonClass, selectClass } from "@/components/ui/form";
import type { SharedMapView } from "@/server/shared-maps";
import { ExportMapPanel } from "@/components/export/export-map-panel";
import { MapAttribution } from "@/components/map/map-attribution";
import { RegionBreakdown } from "@/components/map/region-breakdown";
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
  region: CountryRegion;
  count?: number;
};

type ComparisonMode = "everyone" | "only-you" | "nobody";
type ViewMode = "combined" | "member" | ComparisonMode;

const comparisonModes = new Set<string>([
  "everyone",
  "only-you",
  "nobody",
]);

function isComparisonMode(value: string): value is ComparisonMode {
  return comparisonModes.has(value);
}

export function SharedMapExperience({ map }: SharedMapExperienceProps) {
  const [selected, setSelected] = useState("combined");
  const { geometry, error, retry } = useMapGeometry();
  const filterId = useId();
  const mapHeadingId = useId();
  const mapTitleId = useId();
  const listHeadingId = useId();

  const selectedMember = useMemo(() => {
    if (!selected.startsWith("member:")) return null;
    const id = selected.slice("member:".length);
    return map.members.find((member) => member.id === id) ?? null;
  }, [map.members, selected]);

  const currentMember = useMemo(
    () => map.members.find((member) => member.isCurrentUser) ?? null,
    [map.members],
  );

  const viewMode: ViewMode = selectedMember
    ? "member"
    : isComparisonMode(selected)
      ? selected
      : "combined";

  const comparison = useMemo(
    () =>
      getSharedComparison({
        memberCount: map.members.length,
        combinedCountries: map.combinedCountries,
        currentUserCountries:
          map.members.find((member) => member.isCurrentUser)?.countries ?? [],
      }),
    [map.combinedCountries, map.members],
  );

  const visibleCodes = useMemo(() => {
    if (selectedMember) return new Set(selectedMember.countries);
    if (viewMode === "everyone") return new Set(comparison.everyone);
    if (viewMode === "only-you") return new Set(comparison.onlyYou);
    if (viewMode === "nobody") return new Set(comparison.nobody);
    return new Set(map.combinedCountries.map((country) => country.code));
  }, [comparison, map.combinedCountries, selectedMember, viewMode]);

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
        region: country.region,
        count: viewMode === "combined" ? counts.get(code) : undefined,
      });
    }

    return visible.sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
  }, [map.combinedCountries, viewMode, visibleCodes]);

  const visibleCount = visibleCountries.length;
  const percent = Math.round((visibleCount / countryCount) * 1000) / 10;

  const viewLabel =
    viewMode === "member" && selectedMember
      ? `${selectedMember.name}${selectedMember.isCurrentUser ? " (you)" : ""}`
      : viewMode === "everyone"
        ? "every member"
        : viewMode === "only-you"
          ? "only you"
          : viewMode === "nobody"
            ? "no one yet"
            : "any member";

  const progressLabel =
    viewMode === "member"
      ? "One member"
      : viewMode === "everyone"
        ? "Group overlap"
        : viewMode === "only-you"
          ? "Only you"
          : viewMode === "nobody"
            ? "Still unmarked"
            : "Combined progress";

  const progressDescription =
    viewMode === "member" && selectedMember
      ? `countries marked by ${viewLabel}`
      : viewMode === "everyone"
        ? "countries marked by every member"
        : viewMode === "only-you"
          ? "countries marked only by you"
          : viewMode === "nobody"
            ? "countries not yet marked by anyone"
            : "countries marked by any member";

  const mapDescription =
    viewMode === "member"
      ? `Countries marked by ${viewLabel}.`
      : viewMode === "everyone"
        ? "Countries every member has marked."
        : viewMode === "only-you"
          ? "Countries you have marked that no other member has."
          : viewMode === "nobody"
            ? "Countries no member has marked yet."
            : "Countries marked by at least one member. Use the filter to switch views.";

  const legendNote =
    viewMode === "member"
      ? "This view shows one member's country-level marks."
      : viewMode === "everyone"
        ? "A country is marked when every member has visited it."
        : viewMode === "only-you"
          ? "Countries are marked here only when you visited them and no other member has."
          : viewMode === "nobody"
            ? "These are the countries no member has marked yet."
            : "A country is marked when at least one member has visited it.";

  const listCountLabel =
    viewMode === "nobody"
      ? `${visibleCount} of ${countryCount} not marked yet`
      : `${visibleCount} of ${countryCount} marked`;

  const legendLabels =
    viewMode === "nobody"
      ? { marked: "Not marked yet", unmarked: "Marked by someone" }
      : { marked: "Marked", unmarked: "Not marked" };

  const emptyMessage =
    viewMode === "member" && selectedMember
      ? `${selectedMember.name} has not marked any countries yet.`
      : viewMode === "everyone"
        ? "No country has been marked by every member yet."
        : viewMode === "only-you"
          ? "No countries are marked only by you."
          : viewMode === "nobody"
            ? "Every country has been marked by at least one member."
            : "No one in this map has marked a country yet.";

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
              Shared map
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {mapDescription}
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
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className={selectClass}
            >
              <option value="combined">
                Whole group · {map.combinedCount} marked
              </option>
              <optgroup label="Comparison">
                <option value="everyone">
                  Visited by everyone · {comparison.everyone.length}
                </option>
                <option value="only-you">
                  Only you · {comparison.onlyYou.length}
                </option>
                <option value="nobody">
                  Not yet by anyone · {comparison.nobody.length}
                </option>
              </optgroup>
              <optgroup label="Members">
                {map.members.map((member) => (
                  <option key={member.id} value={`member:${member.id}`}>
                    {member.name}
                    {member.isCurrentUser ? " (you)" : ""} · {member.count}{" "}
                    marked
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-y border-line/70 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
              {progressLabel}
            </p>
            <p className="mt-1 font-display text-3xl tracking-tight">
              <span aria-live="polite">{visibleCount}</span> of {countryCount}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {progressDescription}
            </p>
          </div>
          <p className="text-sm font-medium text-moss">
            {percent.toLocaleString("en", { maximumFractionDigits: 1 })}% of the
            world
          </p>
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-line/70 bg-canvas/45 px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-moss">
              Visited by everyone
            </dt>
            <dd className="mt-0.5 font-display text-xl tracking-tight">
              {comparison.everyone.length}
            </dd>
          </div>
          <div className="rounded-xl border border-line/70 bg-canvas/45 px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-moss">
              Only you
            </dt>
            <dd className="mt-0.5 font-display text-xl tracking-tight">
              {comparison.onlyYou.length}
            </dd>
          </div>
          <div className="rounded-xl border border-line/70 bg-canvas/45 px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-moss">
              Not yet by anyone
            </dt>
            <dd className="mt-0.5 font-display text-xl tracking-tight">
              {comparison.nobody.length}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-line/70 pt-4">
          <RegionBreakdown
            codes={visibleCodes}
            title="This view by region"
            description="Countries in the current view, out of each region's total."
            countLabel={viewMode === "nobody" ? "not marked" : "marked"}
          />
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
                {viewMode === "nobody"
                  ? "World map showing countries not yet marked by anyone."
                  : `World map showing countries marked by ${viewLabel}.`}
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
                        ? viewMode === "nobody"
                          ? "not marked by anyone"
                          : viewMode === "everyone"
                            ? "marked by every member"
                            : viewMode === "only-you"
                              ? "marked only by you"
                              : selectedMember
                                ? `marked by ${selectedMember.name}`
                                : `marked by ${combinedCount} of ${map.members.length} ${
                                  map.members.length === 1
                                    ? "member"
                                    : "members"
                                }`
                        : viewMode === "nobody"
                          ? "marked by at least one member"
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
            {legendLabels.marked}
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-full border border-moss bg-map"
            />
            {legendLabels.unmarked}
          </span>
          <span>{legendNote}</span>
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
            {listCountLabel}
          </p>
        </div>

        {visibleCountries.length === 0 ? (
          <p className="mt-4 rounded-xl border border-line/70 bg-canvas/50 px-4 py-3 text-sm text-ink-muted">
            {emptyMessage}
          </p>
        ) : (
          <ul className="mt-4 grid max-h-[26rem] gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2 lg:grid-cols-3">
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
                    {country.code} · {country.region}
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

      {currentMember ? (
        <ExportMapPanel
          visited={currentMember.countries}
          geometry={geometry}
          context="shared"
        />
      ) : null}

      <MapAttribution />
    </div>
  );
}
