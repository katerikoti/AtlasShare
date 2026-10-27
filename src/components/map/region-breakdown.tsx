import { getRegionBreakdown } from "@/data/country-insights";

type RegionBreakdownProps = {
  codes: Iterable<string>;
  title?: string;
  description?: string;
  countLabel?: "marked" | "not marked";
};

/**
 * Small CSS bars for marked countries by region. The text values carry the
 * meaning; the bars are decorative and hidden from assistive technology.
 */
export function RegionBreakdown({
  codes,
  title = "By region",
  description = "Marked countries out of each region's total.",
  countLabel = "marked",
}: RegionBreakdownProps) {
  const breakdown = getRegionBreakdown(codes);
  const markedTotal = breakdown.reduce((sum, item) => sum + item.marked, 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
          {title}
        </h3>
        <p className="text-[11px] text-ink-muted">
          {markedTotal} {countLabel}
        </p>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>

      <ul className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
        {breakdown.map((item) => (
          <li key={item.region}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium text-ink">{item.region}</span>
              <span className="text-ink-muted">
                {item.marked} of {item.total}
                <span className="sr-only"> {countLabel}</span>
              </span>
            </div>
            <div
              aria-hidden="true"
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/70"
            >
              <div
                className="h-full rounded-full bg-rose-deep"
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
