"use client";

import { useActionState, useId } from "react";

import { updateSharedMapAction } from "@/server/actions/shared-maps";
import type { SharedMapActionState } from "@/server/actions/types";
import {
  Field,
  FormMessage,
  inputClass,
  primaryButtonClass,
} from "@/components/ui/form";

const initialState: SharedMapActionState = { status: "idle" };

export function MapSettingsForm({
  mapId,
  name,
  description,
}: {
  mapId: string;
  name: string;
  description: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateSharedMapAction,
    initialState,
  );
  const nameId = useId();
  const descriptionId = useId();

  return (
    <form action={action} className="mt-5 max-w-xl">
      <input type="hidden" name="mapId" value={mapId} />
      <div className="space-y-4">
        <Field label="Map name" htmlFor={nameId}>
          <input
            id={nameId}
            name="name"
            required
            maxLength={80}
            defaultValue={name}
            className={inputClass}
          />
        </Field>
        <Field
          label="Description (optional)"
          htmlFor={descriptionId}
          hint="Up to 280 characters."
        >
          <textarea
            id={descriptionId}
            name="description"
            maxLength={280}
            rows={3}
            defaultValue={description ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-4 space-y-3">
        <FormMessage status={state.status} message={state.message} />
        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClass} sm:w-auto`}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
