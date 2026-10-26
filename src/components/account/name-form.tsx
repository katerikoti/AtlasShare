"use client";

import { useActionState } from "react";

import {
  updateNameAction,
} from "@/server/actions/account";
import type { AccountActionState } from "@/server/actions/types";
import {
  Field,
  FormMessage,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui/form";

const initialState: AccountActionState = { status: "idle" };

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(
    updateNameAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="Display name" htmlFor="name">
        <input
          key={name}
          id="name"
          name="name"
          type="text"
          defaultValue={name}
          required
          maxLength={80}
          autoComplete="name"
          className={inputClass}
          disabled={pending}
        />
      </Field>

      <FormMessage status={state.status} message={state.message} />

      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
