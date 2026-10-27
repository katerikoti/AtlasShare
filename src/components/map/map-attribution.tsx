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
        (CC BY 4.0), filtered to the 193 UN member states plus the Holy See and
        Palestine. Boundaries follow the source data and are not a statement
        about disputed territories. Read the{" "}
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
