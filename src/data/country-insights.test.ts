import { describe, expect, it } from "vitest";

import { getRegionBreakdown, getSharedComparison } from "./country-insights";
import { countryCount } from "./countries";
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
