import { countries as generatedCountries } from "./countries.generated";

/**
 * The app's canonical country units.
 *
 * The generated list is the single source of truth for codes, display names,
 * and sort order. Geometry is generated alongside it into
 * `public/map/countries.json`; keep the two files in sync with
 * `npm run data:countries`.
 */
export const countries = generatedCountries;

export type Country = (typeof countries)[number];
export type CountryCode = Country["code"];

export const countryCount = countries.length;

const countryByCode = new Map<string, Country>(
  countries.map((country) => [country.code, country]),
);

export function getCountry(code: string): Country | undefined {
  return countryByCode.get(code);
}

export function isCountryCode(code: string): code is CountryCode {
  return countryByCode.has(code);
}

/**
 * Alphabetical order for search/list UIs. ICU collation keeps accented names
 * (Åland, Côte d'Ivoire, Réunion) next to their unaccented neighbours.
 */
export const countriesAlphabetical = [...countries].sort((a, b) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
);
