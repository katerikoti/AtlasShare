import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteMapForm } from "@/components/shared/delete-map-form";
import { InviteLinkPanel } from "@/components/shared/invite-link-panel";
import {
  LeaveMapButton,
  RemoveMemberButton,
} from "@/components/shared/member-actions";
import { MapSettingsForm } from "@/components/shared/map-settings-form";
import { SharedMapExperience } from "@/components/shared/shared-map-experience";
import { brand } from "@/config/brand";
import { requireMapAccess } from "@/server/authorization";
import {
  getActiveInvitationForMap,
  getSharedMapView,
} from "@/server/shared-maps";
import { requireSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Shared map",
  description: `A private shared map in ${brand.name}.`,
};

export default async function SharedMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ mapId: string }>;
  searchParams: Promise<{ joined?: string | string[] }>;
}) {
  const session = await requireSession();
  const { mapId } = await params;
  const query = await searchParams;
  const access = await requireMapAccess(mapId, session.user.id);
  const map = await getSharedMapView(mapId, session.user.id);
  if (!map) notFound();

  const isOwner = access.role === "OWNER";
  const activeInvitation = isOwner
    ? await getActiveInvitationForMap(mapId, session.user.id)
    : null;

  const manageContent = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
          Members
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Each member&apos;s private map stays private. This view only combines
          which countries are marked; it never changes anyone&apos;s personal
          visits.
        </p>
        <ul className="mt-4 divide-y divide-line/70">
          {map.members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {member.name}
                  {member.isCurrentUser ? (
                    <span className="ml-2 text-xs font-normal text-ink-muted">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-moss">
                  {member.role === "OWNER" ? "Owner" : "Member"} · {member.count}{" "}
                  marked
                </p>
              </div>
              {isOwner && member.role === "MEMBER" ? (
                <RemoveMemberButton
                  mapId={map.id}
                  membershipId={member.id}
                  memberName={member.name}
                />
              ) : null}
            </li>
          ))}
        </ul>

        {!isOwner ? <LeaveMapButton mapId={map.id} mapName={map.name} /> : null}

        {isOwner ? (
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Removing a member removes their contribution from this combined
            view immediately. Their personal map and visits are not deleted.
          </p>
        ) : null}
      </div>

      {isOwner ? (
        <>
          <div className="border-t border-line/70 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
              Invite friends
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              No email addresses needed. Generate a link, send it to anyone —
              for example in a group chat — and everyone who opens it while it
              is valid joins this map as a member. The link expires after 7
              days; you can revoke it or replace it with a new link at any time.
            </p>
            <InviteLinkPanel
              mapId={map.id}
              activeInvitation={
                activeInvitation
                  ? {
                      id: activeInvitation.id,
                      expiresAt: activeInvitation.expiresAt.toISOString(),
                    }
                  : null
              }
            />
          </div>

          <div className="border-t border-line/70 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
              Map details
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Rename the map or update its description. Everyone in the map sees
              these details.
            </p>
            <MapSettingsForm
              mapId={map.id}
              name={map.name}
              description={map.description}
            />
          </div>

          <div className="border-t border-line/70 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-deep">
              Danger zone
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Deleting the shared map ends access for everyone and removes the
              invite link.
            </p>
            <DeleteMapForm mapId={map.id} mapName={map.name} />
          </div>
        </>
      ) : (
        <p className="border-t border-line/70 pt-5 text-sm leading-relaxed text-ink-muted">
          Only the owner can invite or remove people and change the map details.
          You can leave the map above; your personal map will not be changed.
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/shared"
          className="text-sm font-medium text-moss underline decoration-moss/40 underline-offset-4 hover:text-ink"
        >
          ← All shared maps
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
              Shared map · {isOwner ? "Owner" : "Member"}
            </p>
            <h1 className="mt-2 break-words font-display text-4xl tracking-tight">
              {map.name}
            </h1>
            {map.description ? (
              <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
                {map.description}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {query.joined === "1" ? (
        <p
          role="status"
          className="rounded-card border border-moss/30 bg-moss/10 px-5 py-4 text-sm text-ink"
        >
          You joined this shared map. Your marked countries are now included in
          the combined view.
        </p>
      ) : null}

      <SharedMapExperience map={map} />

      <details className="rounded-2xl border border-line/80 bg-surface/80 p-5 shadow-soft sm:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-moss [&::-webkit-details-marker]:hidden">
          <span>{isOwner ? "Members and settings" : "Members"}</span>
          <span aria-hidden="true" className="text-base leading-none">
            +
          </span>
        </summary>
        <div className="mt-5">{manageContent}</div>
      </details>
    </div>
  );
}
