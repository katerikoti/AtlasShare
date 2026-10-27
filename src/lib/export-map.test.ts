import { describe, expect, it } from "vitest";

import { countries, countryCount } from "@/data/countries";
import { createExportMapInput } from "./export-map";

describe("createExportMapInput", () => {
  it("cleans the visit set and derives the count", () => {
    const input = createExportMapInput({
      visited: ["JP", "AQ", "SE", "SE", "not-a-code", "VA"],
      displayName: "  My   travels  ",
      year: 2026,
    });

    expect(input).toEqual({
      visited: countries
        .map((country) => country.code)
        .filter((code) => ["JP", "SE", "VA"].includes(code)),
      count: 3,
      displayName: "My travels",
      year: 2026,
    });
    expect(input.visited).toHaveLength(3);
    expect(countryCount).toBe(195);
  });

  it("contains only the minimal export fields", () => {
    const input = createExportMapInput({
      visited: ["SE"],
      displayName: "Ada's map",
      year: 2026,
    });

    expect(Object.keys(input).sort()).toEqual([
      "count",
      "displayName",
      "visited",
      "year",
    ]);
  });

  it("leaves an empty title undefined and replaces an invalid year", () => {
    const input = createExportMapInput({
      visited: [],
      displayName: "   ",
      year: 1999,
    });

    expect(input.displayName).toBeUndefined();
    expect(input.count).toBe(0);
    expect(input.year).toBe(new Date().getFullYear());
  });

  it("caps the optional title at 40 characters", () => {
    const input = createExportMapInput({
      visited: [],
      displayName: "A".repeat(80),
      year: 2026,
    });

    expect(input.displayName).toHaveLength(40);
  });
});
