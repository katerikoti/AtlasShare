import type { Metadata } from "next";
import Link from "next/link";

import { AcceptInvitationForm } from "@/components/shared/accept-invitation-form";
import { brand } from "@/config/brand";
import { isInvitationToken } from "@/server/invitations";
import { getInvitationPreview } from "@/server/shared-maps";
import { getSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Shared map invitation",
  description: "Accept a private shared-map invitation.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();
  const invitePath = `/invite/${token}`;
  const nextQuery = `?next=${encodeURIComponent(invitePath)}`;

  if (!session) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Invitation
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          You&apos;ve been invited to a shared map
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Sign in, or create an account first — then you&apos;ll come straight
          back here to join. The map name and its members stay hidden until
          then.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={`/sign-in${nextQuery}`}
            className="inline-flex items-center justify-center rounded-full bg-moss px-5 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-ink"
          >
            Sign in to continue
          </Link>
          <Link
            href={`/sign-up${nextQuery}`}
            className="inline-flex items-center justify-center rounded-full border border-moss/35 px-5 py-3 text-sm font-medium text-moss transition-colors hover:border-moss hover:bg-canvas/70"
          >
            Create an account
          </Link>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          This link expires seven days after it was created. Ask the map owner
          for a new link if yours has expired.
        </p>
      </div>
    );
  }

  const preview = isInvitationToken(token)
    ? await getInvitationPreview(token, {
        userId: session.user.id,
      })
    : ({ status: "invalid" } as const);

  if (preview.status === "invalid") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Invitation
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          This invitation is not available
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          The link may have expired, been revoked or replaced, or been copied
          incorrectly. Ask the map owner for a new link.
        </p>
        <Link
          href="/shared"
          className="mt-6 inline-flex items-center justify-center rounded-full border border-moss/35 px-5 py-3 text-sm font-medium text-moss transition-colors hover:border-moss hover:bg-canvas/70"
        >
          Go to your shared maps
        </Link>
      </div>
    );
  }

  if (preview.status === "already-member") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Invitation
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          You already have access
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          You are already a member of “{preview.mapName}”. Open the shared map to
          see the combined view.
        </p>
        <Link
          href={`/shared/${preview.mapId}`}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-moss px-5 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-ink"
        >
          Open shared map
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
        Invitation
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">
        Join “{preview.mapName}”
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        You are signed in as{" "}
        <span className="font-medium text-ink">{session.user.email}</span>. This
        link expires on {dateFormatter.format(new Date(preview.expiresAt))}.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        Joining adds you as a member. Members can see each other&apos;s names
        and which countries they have marked, but not email addresses, notes, or
        visit dates. Your personal map stays yours.
      </p>
      <AcceptInvitationForm token={token} />
      <p className="mt-5 text-xs leading-relaxed text-ink-muted">
        Anyone with this link and a {brand.name} account can join while it is
        valid.
      </p>
    </div>
  );
}
