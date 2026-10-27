import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { DeleteMapForm } from "@/components/shared/delete-map-form";
import { InviteMemberForm } from "@/components/shared/invite-member-form";
import {
  LeaveMapButton,
  RemoveMemberButton,
} from "@/components/shared/member-actions";
import { MapSettingsForm } from "@/components/shared/map-settings-form";
import { RevokeInvitationButton } from "@/components/shared/revoke-invitation-button";
import { SharedMapExperience } from "@/components/shared/shared-map-experience";
import { brand } from "@/config/brand";
import { requireMapAccess } from "@/server/authorization";
import {
  getPendingInvitationsForMap,
  getSharedMapView,
} from "@/server/shared-maps";
import { requireSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Shared map",
  description: `A private shared map in ${brand.name}.`,
};

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function Section({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={`rounded-card border p-6 shadow-soft sm:p-8 ${
        tone === "danger"
          ? "border-rose-deep/30 bg-rose/10"
          : "border-line/80 bg-surface/80"
      }`}
    >
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

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
  const pendingInvitations = isOwner
    ? await getPendingInvitationsForMap(mapId, session.user.id)
    : [];

  const membersPanel = (
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
              Invite someone
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Invitations are single-use, expire after 7 days, and only work for
              the email address they are sent to. The email contains the link;
              you can also copy it here.
            </p>
            <InviteMemberForm mapId={map.id} />
          </div>

          <div className="border-t border-line/70 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
              Pending invitations
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Revoke a link if it was sent to the wrong address or is no longer
              needed. Accepted invitations disappear from this list.
            </p>
            {pendingInvitations.length === 0 ? (
              <p className="mt-4 rounded-xl border border-line/70 bg-canvas/50 px-4 py-3 text-sm text-ink-muted">
                No pending invitations.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line/70">
                {pendingInvitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="break-all font-medium">{invitation.email}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Expires{" "}
                        {dateFormatter.format(new Date(invitation.expiresAt))}
                      </p>
                    </div>
                    <RevokeInvitationButton
                      mapId={map.id}
                      invitationId={invitation.id}
                      email={invitation.email}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
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

      <SharedMapExperience map={map} membersPanel={membersPanel} />

      {isOwner ? (
        <>
          <Section
            title="Map details"
            description="Rename the map or update its description. Everyone in the map sees these details."
          >
            <MapSettingsForm
              mapId={map.id}
              name={map.name}
              description={map.description}
            />
          </Section>

          <Section
            title="Danger zone"
            description="Deleting the shared map ends access for everyone and removes pending invitations."
            tone="danger"
          >
            <DeleteMapForm mapId={map.id} mapName={map.name} />
          </Section>
        </>
      ) : (
        <p className="rounded-card border border-line/80 bg-surface/60 p-5 text-sm leading-relaxed text-ink-muted">
          Only the owner can invite or remove people and change the map details.
          You can leave the map from the Show more section above; your personal
          map will not be changed.
        </p>
      )}
    </div>
  );
}
