import { describe, expect, it } from "vitest";

import {
  filterCountries,
  getRegionBreakdown,
  getSharedComparison,
} from "./country-insights";
import { countryCount, type CountryCode } from "./countries";
import { countryRegionOrder } from "./country-regions";

describe("country insights", () => {
  it("counts marked countries by region and sums to the total", () => {
    const codes = ["SE", "NO", "FR", "JP", "US", "AQ"];
    const breakdown = getRegionBreakdown(codes);

    expect(breakdown.map((entry) => entry.region)).toEqual(
      countryRegionOrder,
    );
    expect(breakdown.reduce((sum, entry) => sum + entry.marked, 0)).toBe(
      codes.length,
    );
    expect(breakdown.reduce((sum, entry) => sum + entry.total, 0)).toBe(
      countryCount,
    );
    expect(breakdown.find((entry) => entry.region === "Europe")).toMatchObject({
      marked: 3,
      total: 52,
    });
    expect(breakdown.find((entry) => entry.region === "Antarctica")).toMatchObject(
      { marked: 1, total: 4 },
    );
  });

  it("ignores unknown or duplicate codes in the breakdown", () => {
    const breakdown = getRegionBreakdown(["SE", "SE", "XX"]);
    expect(breakdown.reduce((sum, entry) => sum + entry.marked, 0)).toBe(1);
  });

  it("combines search, visited, region, and sort controls", () => {
    const visited = new Set<CountryCode>(["SE", "NO", "JP"]);

    const europe = filterCountries({
      visited,
      query: "n",
      visitedFilter: "visited",
      region: "Europe",
      sort: "name",
    });

    expect(europe.map((country) => country.code)).toEqual(["NO", "SE"]);
    expect(
      europe.every(
        (country) =>
          country.region === "Europe" && visited.has(country.code),
      ),
    ).toBe(true);
  });

  it("filters to unvisited countries and resets to the full alphabetical list", () => {
    const visited = new Set<CountryCode>(["SE"]);
    const unvisited = filterCountries({
      visited,
      visitedFilter: "unvisited",
    });

    expect(unvisited).toHaveLength(countryCount - 1);
    expect(unvisited.some((country) => country.code === "SE")).toBe(false);

    const all = filterCountries({ visited });
    expect(all).toHaveLength(countryCount);
  });

  it("sorts by region order and then by name", () => {
    const countries = filterCountries({
      visited: new Set(),
      region: "Asia",
      sort: "region",
    });

    const regionIndexes = countries.map((country) =>
      countryRegionOrder.indexOf(country.region),
    );
    expect(new Set(regionIndexes)).toEqual(new Set([2]));

    const names = countries.map((country) => country.name);
    const expected = [...names].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" }),
    );
    expect(names).toEqual(expected);
  });

  it("puts visited countries first without changing either group's name order", () => {
    const visited = new Set<CountryCode>(["JP"]);
    const countries = filterCountries({ visited, sort: "visited" });

    expect(countries[0].code).toBe("JP");
    expect(countries[1].code).toBe("AF");
    expect(countries[countries.length - 1].code).toBe("ZW");
  });

  it("derives shared comparison sets from codes and counts only", () => {
    const comparison = getSharedComparison({
      memberCount: 2,
      combinedCountries: [
        { code: "SE", count: 2 },
        { code: "NO", count: 1 },
        { code: "FR", count: 1 },
      ],
      currentUserCountries: ["SE", "NO"],
    });

    expect(comparison.everyone).toEqual(["SE"]);
    expect(comparison.onlyYou).toEqual(["NO"]);
    expect(comparison.nobody).toHaveLength(countryCount - 3);
    expect(comparison.nobody).not.toContain("SE");
    expect(comparison.nobody).not.toContain("NO");
    expect(comparison.nobody).not.toContain("FR");
  });

  it("treats every marked country as shared and exclusive for a single member", () => {
    const comparison = getSharedComparison({
      memberCount: 1,
      combinedCountries: [
        { code: "SE", count: 1 },
        { code: "NO", count: 1 },
      ],
      currentUserCountries: ["SE", "NO"],
    });

    expect(comparison.everyone).toEqual(["NO", "SE"]);
    expect(comparison.onlyYou).toEqual(["NO", "SE"]);
    expect(comparison.nobody).toHaveLength(countryCount - 2);
  });
});
