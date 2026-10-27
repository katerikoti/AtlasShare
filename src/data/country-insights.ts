import {
  countries,
  countriesAlphabetical,
  getCountry,
  isCountryCode,
  type Country,
  type CountryCode,
} from "./countries";
import {
  countryRegionOrder,
  type CountryRegion,
} from "./country-regions";

export type VisitedFilter = "all" | "visited" | "unvisited";
export type CountrySort = "name" | "region" | "visited";

const collator = new Intl.Collator("en", { sensitivity: "base" });

function normalizeSearchTerm(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function countryMatchesSearch(country: Country, term: string): boolean {
  if (!term) return true;

  const haystack = `${country.name} ${country.code}`
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  return haystack.includes(term);
}

const regionOrder = new Map(
  countryRegionOrder.map((region, index) => [region, index]),
);

function compareByRegion(a: Country, b: Country): number {
  const difference =
    (regionOrder.get(a.region) ?? 0) - (regionOrder.get(b.region) ?? 0);
  return difference || collator.compare(a.name, b.name);
}

export type FilterCountriesInput = {
  visited: ReadonlySet<string>;
  query?: string;
  visitedFilter?: VisitedFilter;
  region?: CountryRegion | "all";
  sort?: CountrySort;
};

/**
 * Filter and sort the country list. Search and every control combine instead
 * of replacing one another, and the caller's visited set is never mutated.
 */
export function filterCountries({
  visited,
  query = "",
  visitedFilter = "all",
  region = "all",
  sort = "name",
}: FilterCountriesInput): Country[] {
  const term = normalizeSearchTerm(query);

  const result = countriesAlphabetical.filter((country) => {
    if (!countryMatchesSearch(country, term)) return false;
    if (region !== "all" && country.region !== region) return false;

    const isVisited = visited.has(country.code);
    if (visitedFilter === "visited" && !isVisited) return false;
    if (visitedFilter === "unvisited" && isVisited) return false;

    return true;
  });

  if (sort === "region") {
    return result.sort(compareByRegion);
  }
  if (sort === "visited") {
    return result.sort((a, b) => {
      const difference =
        Number(visited.has(b.code)) - Number(visited.has(a.code));
      return difference || collator.compare(a.name, b.name);
    });
  }

  return result.sort((a, b) => collator.compare(a.name, b.name));
}

export type RegionBreakdownItem = {
  region: CountryRegion;
  marked: number;
  total: number;
  percent: number;
};

/**
 * Count marked countries in each region. The marked counts always sum to the
 * number of valid marked codes, so the breakdown can never disagree with the
 * headline total.
 */
export function getRegionBreakdown(
  codes: Iterable<string>,
): RegionBreakdownItem[] {
  const marked = new Set<CountryCode>();
  for (const code of codes) {
    if (isCountryCode(code)) marked.add(code);
  }

  const totals = new Map<CountryRegion, number>();
  const counts = new Map<CountryRegion, number>();
  for (const region of countryRegionOrder) {
    totals.set(region, 0);
    counts.set(region, 0);
  }

  for (const country of countries) {
    totals.set(country.region, (totals.get(country.region) ?? 0) + 1);
    if (marked.has(country.code)) {
      counts.set(country.region, (counts.get(country.region) ?? 0) + 1);
    }
  }

  return countryRegionOrder.map((region) => {
    const total = totals.get(region) ?? 0;
    const markedInRegion = counts.get(region) ?? 0;

    return {
      region,
      marked: markedInRegion,
      total,
      percent:
        total === 0
          ? 0
          : Math.round((markedInRegion / total) * 1000) / 10,
    };
  });
}

export type SharedComparison = {
  everyone: CountryCode[];
  onlyYou: CountryCode[];
  nobody: CountryCode[];
};

/**
 * Derive the three shared-map comparison sets from the already-authorized
 * aggregate view. It only reads country codes and counts; it does not need
 * another visit query or any member-identifying data.
 */
export function getSharedComparison({
  memberCount,
  combinedCountries,
  currentUserCountries,
}: {
  memberCount: number;
  combinedCountries: readonly { code: string; count: number }[];
  currentUserCountries: readonly string[];
}): SharedComparison {
  const combinedCounts = new Map<string, number>();
  for (const entry of combinedCountries) {
    combinedCounts.set(entry.code, entry.count);
  }

  const everyone: CountryCode[] = [];
  const onlyYou: CountryCode[] = [];
  const combinedCodes = new Set<CountryCode>();

  for (const entry of combinedCountries) {
    if (!isCountryCode(entry.code)) continue;
    combinedCodes.add(entry.code);
    if (memberCount > 0 && entry.count === memberCount) {
      everyone.push(entry.code);
    }
  }

  for (const code of new Set(currentUserCountries)) {
    if (!isCountryCode(code)) continue;
    if (combinedCounts.get(code) === 1) {
      onlyYou.push(code);
    }
  }

  const nobody = countries
    .filter((country) => !combinedCodes.has(country.code))
    .map((country) => country.code);

  return {
    everyone: everyone.sort(compareByName),
    onlyYou: onlyYou.sort(compareByName),
    nobody: nobody.sort(compareByName),
  };
}

function compareByName(a: CountryCode, b: CountryCode): number {
  const countryA = getCountry(a);
  const countryB = getCountry(b);
  if (!countryA || !countryB) return a.localeCompare(b);
  return collator.compare(countryA.name, countryB.name);
}
