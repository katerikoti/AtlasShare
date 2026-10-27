import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  countries,
  countriesAlphabetical,
  countryCount,
  getCountry,
  isCountryCode,
} from "./countries";
import { countryRegionOrder } from "./country-regions";

type Geometry = {
  viewBox: string;
  paths: Record<string, string>;
};

const geometry = JSON.parse(
  readFileSync("public/map/countries.json", "utf8"),
) as Geometry;

describe("country dataset", () => {
  it("contains exactly 195 unique alpha-2 countries", () => {
    expect(countryCount).toBe(195);
    expect(countries).toHaveLength(195);

    const codes = countries.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);

    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("has a non-empty, unique display name for every country", () => {
    const names = countries.map((country) => country.name);

    for (const name of names) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it("assigns exactly one region to every country", () => {
    const totals = new Map(countryRegionOrder.map((region) => [region, 0]));

    for (const country of countries) {
      expect(countryRegionOrder).toContain(country.region);
      totals.set(country.region, (totals.get(country.region) ?? 0) + 1);
    }

    expect(
      [...totals.values()].reduce((sum, value) => sum + value, 0),
    ).toBe(countryCount);
    expect(countryRegionOrder.map((region) => totals.get(region))).toEqual([
      54, 35, 48, 44, 14,
    ]);
    expect(getCountry("SE")?.region).toBe("Europe");
    expect(getCountry("JP")?.region).toBe("Asia");
    expect(getCountry("RU")?.region).toBe("Europe");
    expect(getCountry("TR")?.region).toBe("Asia");
    expect(getCountry("VA")?.region).toBe("Europe");
    expect(getCountry("PS")?.region).toBe("Asia");
  });

  it("keeps Palestine and Israel as separate required countries", () => {
    const palestine = getCountry("PS");
    const israel = getCountry("IL");

    expect(palestine?.name).toBe("Palestine");
    expect(israel?.name).toBe("Israel");
    expect(geometry.paths.PS).toBeTruthy();
    expect(geometry.paths.IL).toBeTruthy();
    expect(geometry.paths.PS).not.toBe(geometry.paths.IL);
  });

  it("includes the two UN observer states and excludes territories", () => {
    expect(getCountry("VA")?.name).toBe("Holy See (Vatican City)");
    expect(isCountryCode("PS")).toBe(true);
    expect(geometry.paths.VA).toBeTruthy();
    expect(geometry.paths.PS).toBeTruthy();

    for (const code of ["AQ", "UM", "XK", "TW", "EH"]) {
      expect(isCountryCode(code)).toBe(false);
      expect(geometry.paths[code]).toBeUndefined();
    }
  });

  it("has exactly one non-empty SVG path for every dataset country", () => {
    const geometryCodes = Object.keys(geometry.paths).sort();
    const datasetCodes = countries.map((country) => country.code).sort();

    expect(geometryCodes).toEqual(datasetCodes);
    expect(geometry.viewBox).toMatch(/^0 0 [\d.]+ [\d.]+$/);

    for (const [code, path] of Object.entries(geometry.paths)) {
      expect(path.length, code).toBeGreaterThan(20);
      expect(path.startsWith("M") || path.startsWith("m"), code).toBe(true);
      expect(path.endsWith("Z") || path.endsWith("z"), code).toBe(true);
      expect(path, code).not.toMatch(/[<>]/);
    }
  });

  it("exposes a lookup and sorts the list for the UI", () => {
    expect(getCountry("SE")?.name).toBe("Sweden");
    expect(getCountry("se")).toBeUndefined();
    expect(isCountryCode("SE")).toBe(true);
    expect(isCountryCode("XX")).toBe(false);

    const names = countriesAlphabetical.map((country) => country.name);
    const expected = [...names].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" }),
    );
    expect(names).toEqual(expected);
  });
});
