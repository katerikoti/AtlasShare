import type { Metadata } from "next";
import Link from "next/link";

import { CreateMapForm } from "@/components/shared/create-map-form";
import { brand } from "@/config/brand";
import { countryCount } from "@/data/countries";
import { getSharedMapsForUser } from "@/server/shared-maps";
import { requireSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Shared maps",
  description: `Create and join private shared maps in ${brand.name}.`,
};

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export default async function SharedMapsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string | string[]; left?: string | string[] }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const maps = await getSharedMapsForUser(session.user.id);
  const notice =
    params.deleted === "1"
      ? "Shared map deleted. Everyone's personal maps were left untouched."
      : params.left === "1"
        ? "You left the shared map. Your personal map is unchanged."
        : null;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Shared maps
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          Travel together, privately.
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
          A shared map combines the countries each member has marked, without
          exposing email addresses or private account details. Invitations are
          tied to one email address and expire after seven days.
        </p>
      </header>

      {notice ? (
        <p
          role="status"
          className="rounded-card border border-moss/30 bg-moss/10 px-5 py-4 text-sm text-ink"
        >
          {notice}
        </p>
      ) : null}

      <CreateMapForm />

      <section aria-labelledby="shared-map-list-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="shared-map-list-heading"
            className="font-display text-2xl tracking-tight"
          >
            Maps you belong to
          </h2>
          <p className="text-sm text-ink-muted">
            {plural(maps.length, "map", "maps")}
          </p>
        </div>

        {maps.length === 0 ? (
          <div className="mt-4 rounded-card border border-dashed border-line bg-surface/60 p-6 text-sm leading-relaxed text-ink-muted sm:p-8">
            <p className="font-medium text-ink">No shared maps yet.</p>
            <p className="mt-1 max-w-xl">
              Create one above, then invite someone by email. When they accept,
              their marked countries appear in the combined view.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {maps.map((map) => (
              <li key={map.id}>
                <Link
                  href={`/shared/${map.id}`}
                  className="group flex h-full flex-col rounded-card border border-line/80 bg-surface/80 p-5 shadow-soft transition-colors hover:border-moss/50 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-2xl tracking-tight">
                        {map.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                        {map.role === "OWNER" ? "Owner" : "Member"}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="mt-1 text-lg text-moss transition-transform group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </div>

                  {map.description ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                      {map.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm italic text-ink-muted/75">
                      No description.
                    </p>
                  )}

                  <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line/70 pt-4 text-sm">
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                        Members
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {plural(map.memberCount, "person", "people")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                        Combined
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {map.combinedCount} of {countryCount}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
