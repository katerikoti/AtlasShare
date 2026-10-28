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
import { secondaryButtonClass } from "@/components/ui/form";
import type { SharedMapView } from "@/server/shared-maps";
import { ExportMapPanel } from "@/components/export/export-map-panel";
import { MapAttribution } from "@/components/map/map-attribution";
import { RegionBreakdown } from "@/components/map/region-breakdown";
import { useMapGeometry } from "@/components/map/use-map-geometry";
import { ZoomableMap } from "@/components/map/zoomable-map";

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
type InsightMode = "combined" | ComparisonMode;
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
  const [selectedMemberIds, setSelectedMemberIds] = useState(
    () => new Set(map.members.map((member) => member.id)),
  );
  const [insightMode, setInsightMode] = useState<InsightMode>("combined");
  const { geometry, error, retry } = useMapGeometry();
  const mapHeadingId = useId();
  const summaryHeadingId = useId();
  const mapTitleId = useId();
  const listHeadingId = useId();

  const allMembersSelected = selectedMemberIds.size === map.members.length;
  const selectedMembers = useMemo(
    () => map.members.filter((member) => selectedMemberIds.has(member.id)),
    [map.members, selectedMemberIds],
  );
  const selectedMember =
    insightMode === "combined" &&
    !allMembersSelected &&
    selectedMembers.length === 1
      ? selectedMembers[0]
      : null;

  const exportCodes = useMemo(
    () => {
      if (insightMode !== "combined" || allMembersSelected) {
        return map.combinedCountries.map((country) => country.code);
      }

      return [
        ...new Set(selectedMembers.flatMap((member) => member.countries)),
      ];
    },
    [allMembersSelected, insightMode, map.combinedCountries, selectedMembers],
  );

  const viewMode: ViewMode = selectedMember
    ? "member"
    : isComparisonMode(insightMode)
      ? insightMode
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
    return new Set(selectedMembers.flatMap((member) => member.countries));
  }, [comparison, selectedMember, selectedMembers, viewMode]);

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
            : allMembersSelected
              ? "any member"
              : "selected members";

  const progressLabel =
    viewMode === "member"
      ? "One member"
      : viewMode === "everyone"
        ? "Group overlap"
        : viewMode === "only-you"
          ? "Only you"
          : viewMode === "nobody"
            ? "Still unmarked"
            : allMembersSelected
              ? "Combined progress"
              : "Selected progress";

  const progressDescription =
    viewMode === "member" && selectedMember
      ? `countries marked by ${viewLabel}`
      : viewMode === "everyone"
        ? "countries marked by every member"
        : viewMode === "only-you"
          ? "countries marked only by you"
          : viewMode === "nobody"
            ? "countries not yet marked by anyone"
            : allMembersSelected
              ? "countries marked by any member"
              : "countries marked by the selected members";

  const mapDescription =
    viewMode === "member"
      ? `Countries marked by ${viewLabel}.`
      : viewMode === "everyone"
        ? "Countries every member has marked."
        : viewMode === "only-you"
          ? "Countries you have marked that no other member has."
          : viewMode === "nobody"
            ? "Countries no member has marked yet."
            : allMembersSelected
              ? "Countries marked by at least one member. Use the filter to switch views."
              : "Countries marked by the selected members.";

  const listCountLabel =
    viewMode === "nobody"
      ? `${visibleCount} of ${countryCount} not marked yet`
      : `${visibleCount} of ${countryCount} marked`;

  const emptyMessage =
    viewMode === "member" && selectedMember
      ? `${selectedMember.name} has not marked any countries yet.`
      : viewMode === "everyone"
        ? "No country has been marked by every member yet."
        : viewMode === "only-you"
          ? "No countries are marked only by you."
          : viewMode === "nobody"
            ? "Every country has been marked by at least one member."
            : "The selected members have not marked a country yet.";

  function toggleMember(id: string) {
    setInsightMode("combined");
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllMembers() {
    setInsightMode("combined");
    setSelectedMemberIds(
      allMembersSelected
        ? new Set()
        : new Set(map.members.map((member) => member.id)),
    );
  }

  return (
    <div className="space-y-5">
      <section
        aria-labelledby={summaryHeadingId}
        className="rounded-card border border-line/80 bg-surface/80 p-5 shadow-soft sm:p-6"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2
              id={summaryHeadingId}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-moss"
            >
              {progressLabel}
            </h2>
            <p className="mt-2 font-display text-4xl tracking-tight">
              <span aria-live="polite">{visibleCount}</span> of {countryCount}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {progressDescription}
            </p>
          </div>
          <p className="text-sm font-medium text-moss">
            {map.members.length}{" "}
            {map.members.length === 1 ? "member" : "members"} ·{" "}
            {percent.toLocaleString("en", { maximumFractionDigits: 1 })}% of the
            world
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Countries in this view"
          aria-valuemin={0}
          aria-valuemax={countryCount}
          aria-valuenow={visibleCount}
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-line/70"
        >
          <div
            className="h-full rounded-full bg-rose-deep transition-[width] duration-300"
            style={{ width: `${(visibleCount / countryCount) * 100}%` }}
          />
        </div>

        <details className="mt-5 border-t border-line/70 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-moss [&::-webkit-details-marker]:hidden">
            <span>Show more</span>
            <span aria-hidden="true" className="text-base leading-none">
              +
            </span>
          </summary>

          <div className="mt-5 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                Show
              </h3>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allMembersSelected}
                    onChange={toggleAllMembers}
                    className="size-4 accent-rose-deep"
                  />
                  All
                </label>
                {map.members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.has(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="size-4 accent-rose-deep"
                    />
                    {member.name}
                    {member.isCurrentUser ? " (you)" : ""}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-line/70 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                Compare progress
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["Visited by everyone", comparison.everyone.length, "everyone"],
                    ["Only you", comparison.onlyYou.length, "only-you"],
                    ["Not yet by anyone", comparison.nobody.length, "nobody"],
                  ] as const
                ).map(([label, count, value]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={insightMode === value}
                    onClick={() =>
                      setInsightMode(insightMode === value ? "combined" : value)
                    }
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      insightMode === value
                        ? "border-moss/50 bg-moss/10"
                        : "border-line/70 bg-canvas/45 hover:bg-canvas/70"
                    }`}
                  >
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-moss">
                      {label}
                    </span>
                    <span className="mt-0.5 block font-display text-xl tracking-tight">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <RegionBreakdown
                  codes={visibleCodes}
                  title="By region"
                  description="Countries in the current view, out of each region's total."
                  countLabel={viewMode === "nobody" ? "not marked" : "marked"}
                  collapsible={false}
                />
              </div>
            </div>
          </div>
        </details>
      </section>

      <section
        aria-labelledby={mapHeadingId}
        className="min-w-0 rounded-card border border-line/80 bg-surface/80 p-4 shadow-soft sm:p-6"
      >
        <h2 id={mapHeadingId} className="font-display text-2xl tracking-tight">
          Shared map
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {mapDescription}
        </p>

        {geometry ? (
          <ZoomableMap viewBox={geometry.viewBox} labelledBy={mapTitleId}>
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
          </ZoomableMap>
        ) : (
          <div className="relative mt-4 aspect-[1010/760] w-full overflow-hidden rounded-2xl border border-line/70 bg-map">
            {error ? (
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
        )}
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

      </section>

      <ExportMapPanel
        visited={exportCodes}
        geometry={geometry}
        context={selectedMember ? "shared-member" : "shared"}
        defaultTitle={
          selectedMember
            ? selectedMember.isCurrentUser
              ? "My travels"
              : "Their travels"
            : "Our travels"
        }
      />

      {/* On phones the attribution lives under Account → About. */}
      <div className="max-sm:hidden">
        <MapAttribution />
      </div>
    </div>
  );
}
