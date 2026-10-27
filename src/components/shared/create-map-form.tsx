"use client";

import { useActionState, useId } from "react";

import { createSharedMapAction } from "@/server/actions/shared-maps";
import type { SharedMapActionState } from "@/server/actions/types";
import {
  Field,
  FormMessage,
  inputClass,
  primaryButtonClass,
} from "@/components/ui/form";

const initialState: SharedMapActionState = { status: "idle" };

export function CreateMapForm() {
  const [state, action, pending] = useActionState(
    createSharedMapAction,
    initialState,
  );
  const nameId = useId();
  const descriptionId = useId();

  return (
    <form
      action={action}
      className="rounded-card border border-line/80 bg-surface/80 p-5 shadow-soft sm:p-6"
    >
      <h2 className="font-display text-2xl tracking-tight">
        Create a shared map:
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Name the trip or group. You can invite people after it is created.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Field label="Map name" htmlFor={nameId}>
          <input
            id={nameId}
            name="name"
            required
            maxLength={80}
            autoComplete="off"
            className={inputClass}
            placeholder="Summer in the Nordics"
          />
        </Field>
        <Field
          label="Description (optional)"
          htmlFor={descriptionId}
          hint="Up to 280 characters. Everyone on the map can see this."
        >
          <textarea
            id={descriptionId}
            name="description"
            maxLength={280}
            rows={2}
            className={inputClass}
            placeholder="A place to collect the countries we visit together."
          />
        </Field>
      </div>

      <div className="mt-4 space-y-3">
        <FormMessage status={state.status} message={state.message} />
        <button type="submit" disabled={pending} className={`${primaryButtonClass} sm:w-auto`}>
          {pending ? "Creating…" : "Create map"}
        </button>
      </div>
    </form>
  );
}
