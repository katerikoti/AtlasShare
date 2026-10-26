import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  countries,
  countriesAlphabetical,
  countryCount,
  getCountry,
  isCountryCode,
} from "./countries";

type Geometry = {
  viewBox: string;
  paths: Record<string, string>;
};

const geometry = JSON.parse(
  readFileSync("public/map/countries.json", "utf8"),
) as Geometry;

describe("country dataset", () => {
  it("contains exactly 250 unique alpha-2 units", () => {
    expect(countryCount).toBe(250);
    expect(countries).toHaveLength(250);

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

  it("keeps Palestine and Israel as separate required units", () => {
    const palestine = getCountry("PS");
    const israel = getCountry("IL");

    expect(palestine?.name).toBe("Palestine");
    expect(israel?.name).toBe("Israel");
    expect(geometry.paths.PS).toBeTruthy();
    expect(geometry.paths.IL).toBeTruthy();
    expect(geometry.paths.PS).not.toBe(geometry.paths.IL);
  });

  it("includes the documented special units", () => {
    for (const code of ["AQ", "UM", "XK"]) {
      expect(isCountryCode(code)).toBe(true);
      expect(geometry.paths[code]).toBeTruthy();
    }
  });

  it("has exactly one non-empty SVG path for every dataset unit", () => {
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
