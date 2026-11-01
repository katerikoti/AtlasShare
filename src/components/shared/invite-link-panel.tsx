"use client";

import { useActionState, useId, useState } from "react";

import {
  FormMessage,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/form";
import {
  generateInviteLinkAction,
  revokeInvitationAction,
} from "@/server/actions/shared-maps";
import type { InvitationActionState } from "@/server/actions/types";

const initialState: InvitationActionState = { status: "idle" };

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

export type ActiveInvitationView = {
  id: string;
  expiresAt: string;
};

/**
 * Owner-facing invite panel: generate, replace, revoke, and copy the map's
 * join link. The link is only ever returned by the generate action (the
 * database stores a hash), so it cannot be re-displayed after a reload —
 * replacing the link is always available and members are never affected.
 */
export function InviteLinkPanel({
  mapId,
  activeInvitation,
}: {
  mapId: string;
  activeInvitation: ActiveInvitationView | null;
}) {
  const [state, action, pending] = useActionState(
    generateInviteLinkAction,
    initialState,
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const linkId = useId();

  const hasFreshLink = state.status === "success" && state.inviteUrl;
  const freshExpiry = state.expiresAt
    ? new Date(state.expiresAt)
    : null;

  async function copyLink() {
    if (!state.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopyStatus("Link copied.");
    } catch {
      setCopyStatus("Could not copy automatically. Select the link to copy it.");
    }
  }

  return (
    <div className="mt-4 max-w-xl space-y-3">
      <FormMessage status={state.status} message={state.message} />

      {state.inviteUrl ? (
        <div className="rounded-xl border border-moss/30 bg-moss/10 p-4">
          <label
            htmlFor={linkId}
            className="block text-xs font-semibold uppercase tracking-[0.16em] text-moss"
          >
            Copyable invite link
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id={linkId}
              value={state.inviteUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-line bg-canvas/70 px-3 py-2 font-mono text-xs text-ink"
            />
            <button
              type="button"
              onClick={copyLink}
              className={`${secondaryButtonClass} shrink-0`}
            >
              Copy link
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {freshExpiry
              ? `Valid until ${dateFormatter.format(freshExpiry)}. `
              : ""}
            Send it to as many friends as you like. Everyone who opens the link
            while it is valid joins as a member.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            For privacy the server keeps only a hash of the link, so it cannot
            be shown again after you leave the page. Generate a new link at any
            time; people who already joined stay members.
          </p>
          <p
            role="status"
            aria-live="polite"
            className="mt-2 min-h-4 text-xs font-medium text-moss"
          >
            {copyStatus}
          </p>
        </div>
      ) : null}

      {!hasFreshLink && activeInvitation ? (
        <div className="rounded-xl border border-line/70 bg-canvas/50 p-4">
          <p className="text-sm font-medium text-ink">
            An invite link is active right now.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            It expires on {dateFormatter.format(new Date(activeInvitation.expiresAt))}.
            The link itself was shown once when you generated it — generate a
            fresh one at any time (this instantly replaces the old link, and
            people who already joined keep access), or revoke it to stop new
            joins.
          </p>
        </div>
      ) : null}

      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="mapId" value={mapId} />
        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClass} mt-2 w-full sm:w-auto`}
        >
          {pending
            ? "Working…"
            : activeInvitation
              ? "Replace with a new link"
              : "Generate invite link"}
        </button>
      </form>

      {activeInvitation ? (
        <RevokeInviteLinkForm
          mapId={mapId}
          invitationId={activeInvitation.id}
        />
      ) : null}
    </div>
  );
}

function RevokeInviteLinkForm({
  mapId,
  invitationId,
}: {
  mapId: string;
  invitationId: string;
}) {
  const [state, action, pending] = useActionState(
    revokeInvitationAction,
    initialState,
  );

  return (
    <form action={action} className="max-w-xl">
      <input type="hidden" name="mapId" value={mapId} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Revoke the invite link"
        className={`${secondaryButtonClass} mt-2 w-full sm:w-auto`}
      >
        {pending ? "Revoking…" : "Revoke link"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}
