"use client";

import { useActionState } from "react";

import {
  leaveSharedMapAction,
  removeMemberAction,
} from "@/server/actions/shared-maps";
import type { SharedMapActionState } from "@/server/actions/types";
import { FormMessage, secondaryButtonClass } from "@/components/ui/form";

const initialState: SharedMapActionState = { status: "idle" };

const quietDangerButtonClass =
  "inline-flex items-center justify-center rounded-full border border-rose-deep/40 bg-rose/15 px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-rose/30 disabled:opacity-60";

export function RemoveMemberButton({
  mapId,
  membershipId,
  memberName,
}: {
  mapId: string;
  membershipId: string;
  memberName: string;
}) {
  const [state, action, pending] = useActionState(
    removeMemberAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="shrink-0"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove ${memberName} from this shared map? Their personal map will not be changed.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="mapId" value={mapId} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <button
        type="submit"
        disabled={pending}
        className={quietDangerButtonClass}
        aria-label={`Remove ${memberName} from this map`}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

export function LeaveMapButton({
  mapId,
  mapName,
}: {
  mapId: string;
  mapName: string;
}) {
  const [state, action, pending] = useActionState(
    leaveSharedMapAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="mt-5 max-w-md"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Leave “${mapName}”? Your countries stay on your personal map.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="mapId" value={mapId} />
      <div className="space-y-3">
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          {pending ? "Leaving…" : "Leave this map"}
        </button>
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}
