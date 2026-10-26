"use client";

import { useActionState } from "react";

import { revokeInvitationAction } from "@/server/actions/shared-maps";
import type { SharedMapActionState } from "@/server/actions/types";
import { FormMessage, secondaryButtonClass } from "@/components/ui/form";

const initialState: SharedMapActionState = { status: "idle" };

export function RevokeInvitationButton({
  mapId,
  invitationId,
  email,
}: {
  mapId: string;
  invitationId: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(
    revokeInvitationAction,
    initialState,
  );

  return (
    <form action={action} className="shrink-0 text-right">
      <input type="hidden" name="mapId" value={mapId} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Revoke invitation for ${email}`}
        className={secondaryButtonClass}
      >
        {pending ? "Revoking…" : "Revoke"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}
