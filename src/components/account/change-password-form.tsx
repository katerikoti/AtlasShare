"use client";

import { useActionState } from "react";

import { changePasswordAction } from "@/server/actions/account";
import type { AccountActionState } from "@/server/actions/types";
import {
  Field,
  FormMessage,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui/form";

const initialState: AccountActionState = { status: "idle" };

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="Current password" htmlFor="currentPassword">
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className={inputClass}
          disabled={pending}
        />
      </Field>

      <Field
        label="New password"
        htmlFor="newPassword"
        hint="At least 12 characters. Changing it signs out other devices."
      >
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          className={inputClass}
          disabled={pending}
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirmPassword">
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          className={inputClass}
          disabled={pending}
        />
      </Field>

      <FormMessage status={state.status} message={state.message} />

      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
