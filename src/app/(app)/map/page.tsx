import type { Metadata } from "next";
import { Suspense } from "react";

import { MapExperience } from "@/components/map/map-experience";
import { brand } from "@/config/brand";
import { requireSession } from "@/server/session";
import { getVisitedCountryCodes } from "@/server/visits";

export const metadata: Metadata = {
  title: "Your map",
  description: `Mark the countries you have visited in ${brand.name}.`,
};

function MapLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-moss/20" />
        <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded-xl bg-ink/10" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-full bg-ink/10" />
      </div>
      <div className="h-32 animate-pulse rounded-card border border-line/60 bg-surface/70" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="aspect-[1010/760] animate-pulse rounded-card border border-line/60 bg-surface/70" />
        <div className="h-96 animate-pulse rounded-card border border-line/60 bg-surface/70" />
      </div>
      <p className="sr-only">Loading your map…</p>
    </div>
  );
}

async function MapContent() {
  const session = await requireSession();
  const visited = await getVisitedCountryCodes(session.user.id);

  return <MapExperience initialVisited={visited} />;
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapLoading />}>
      <MapContent />
    </Suspense>
  );
}
