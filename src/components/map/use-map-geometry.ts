"use client";

import { useEffect, useState } from "react";

import { countriesAlphabetical } from "@/data/countries";

export type MapGeometry = {
  viewBox: string;
  paths: Record<string, string>;
};

const mapErrorMessage =
  "The map could not load. Check your connection and try again.";

/**
 * Load and validate the public SVG geometry. The asset is checked against the
 * committed 195-country dataset before any path is rendered. Retrying resets the
 * error and refetches; no user data is involved.
 */
export function useMapGeometry() {
  const [geometry, setGeometry] = useState<MapGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/map/countries.json", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Map request failed with ${response.status}`);
        }
        const data = (await response.json()) as Partial<MapGeometry>;
        if (
          typeof data.viewBox !== "string" ||
          !data.paths ||
          typeof data.paths !== "object"
        ) {
          throw new Error("Map data is missing a viewBox or paths");
        }
        const missing = countriesAlphabetical.filter(
          (country) => typeof data.paths?.[country.code] !== "string",
        );
        if (missing.length > 0) {
          throw new Error(`Map data is missing ${missing.length} countries`);
        }
        setGeometry(data as MapGeometry);
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setError(mapErrorMessage);
      });

    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setGeometry(null);
    setError(null);
    setAttempt((current) => current + 1);
  }

  return { geometry, error, retry };
}
