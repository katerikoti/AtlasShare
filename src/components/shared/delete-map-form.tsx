"use client";

import { useActionState, useId } from "react";

import { deleteSharedMapAction } from "@/server/actions/shared-maps";
import type { SharedMapActionState } from "@/server/actions/types";
import { Field, FormMessage, inputClass } from "@/components/ui/form";

const initialState: SharedMapActionState = { status: "idle" };

const dangerButtonClass =
  "inline-flex w-full items-center justify-center rounded-full bg-rose-deep px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-rose focus-visible:bg-rose disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

export function DeleteMapForm({
  mapId,
  mapName,
}: {
  mapId: string;
  mapName: string;
}) {
  const [state, action, pending] = useActionState(
    deleteSharedMapAction,
    initialState,
  );
  const confirmationId = useId();

  return (
    <details className="mt-5 rounded-xl border border-rose-deep/30 bg-rose/10 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        Delete this shared map
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        This removes “{mapName}”, its memberships, and pending invitations.
        Everyone&apos;s private personal maps and visits are untouched.
      </p>
      <form action={action} className="mt-4 max-w-md">
        <input type="hidden" name="mapId" value={mapId} />
        <Field
          label="Type DELETE to confirm"
          htmlFor={confirmationId}
          hint="This action cannot be undone."
        >
          <input
            id={confirmationId}
            name="confirmation"
            required
            autoComplete="off"
            className={inputClass}
            placeholder="DELETE"
          />
        </Field>
        <div className="mt-4 space-y-3">
          <FormMessage status={state.status} message={state.message} />
          <button type="submit" disabled={pending} className={dangerButtonClass}>
            {pending ? "Deleting…" : "Delete shared map"}
          </button>
        </div>
      </form>
    </details>
  );
}
