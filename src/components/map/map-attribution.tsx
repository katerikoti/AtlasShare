export function MapAttribution() {
  return (
    <details className="rounded-2xl border border-line/80 bg-surface/70 px-5 py-4 text-sm leading-relaxed text-ink-muted">
      <summary className="cursor-pointer font-medium text-ink">
        About the map data
      </summary>
      <p className="mt-3">
        Country geometry is based on{" "}
        <a
          href="https://github.com/VictorCazanave/svg-maps"
          className="font-medium text-moss underline underline-offset-2"
        >
          @svg-maps/world
        </a>{" "}
        (CC BY 4.0), modified by removing non-ISO paths, merging the United
        States Minor Outlying Islands subdivisions, and adding a Natural Earth
        1:10m Antarctica outline (public domain). Palestine and Israel are
        separate map units. Boundaries follow the source data and are not a
        statement about disputed territories. Read the{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          className="font-medium text-moss underline underline-offset-2"
        >
          licence
        </a>
        .
      </p>
    </details>
  );
}
