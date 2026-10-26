"use client";

import { useActionState } from "react";

import { deleteAccountAction } from "@/server/actions/account";
import type { AccountActionState } from "@/server/actions/types";
import {
  Field,
  FormMessage,
  inputClass,
} from "@/components/ui/form";

const initialState: AccountActionState = { status: "idle" };

const dangerButtonClass =
  "inline-flex items-center justify-center rounded-full border border-rose-deep/60 bg-rose/30 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-rose/50 disabled:cursor-not-allowed disabled:opacity-60";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(
    deleteAccountAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-muted">
        This permanently deletes your account, your visits, and any shared maps
        you own. Other members lose access to those maps. This cannot be
        undone.
      </p>

      <Field label="Password" htmlFor="deletePassword">
        <input
          id="deletePassword"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className={inputClass}
          disabled={pending}
        />
      </Field>

      <Field
        label="Type DELETE to confirm"
        htmlFor="confirmation"
        hint="Capitals matter."
      >
        <input
          id="confirmation"
          name="confirmation"
          type="text"
          required
          pattern="DELETE"
          autoComplete="off"
          className={inputClass}
          disabled={pending}
        />
      </Field>

      <FormMessage status={state.status} message={state.message} />

      <button type="submit" className={dangerButtonClass} disabled={pending}>
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
