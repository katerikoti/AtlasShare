"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  Field,
  FormMessage,
  inputClass,
  primaryButtonClass,
} from "@/components/ui/form";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 12) {
      setError("Use at least 12 characters for your password.");
      return;
    }
    if (newPassword !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    const { error: authError } = await authClient.resetPassword({
      newPassword,
      token,
    });
    setPending(false);

    if (authError) {
      setError(
        "This reset link is invalid or has expired. Request a new one.",
      );
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          Password updated
        </h1>
        <p className="mt-4 text-ink-muted">
          Your new password is active. Sign in to continue.
        </p>
        <Link
          href="/sign-in"
          className={`${primaryButtonClass} mt-7`}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          Reset link incomplete
        </h1>
        <p className="mt-4 text-ink-muted">
          This page needs a valid reset token. Request a fresh link and use it
          within an hour.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex font-medium text-moss underline decoration-moss/40 underline-offset-4 hover:text-ink"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
        Choose a new password
      </h1>
      <p className="mt-3 text-ink-muted">
        For your security, this link works once and expires after an hour.
      </p>

      <form onSubmit={onSubmit} method="post" className="mt-8 space-y-5" noValidate>
        <Field
          label="New password"
          htmlFor="newPassword"
          hint="At least 12 characters. A short sentence works well."
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

        <FormMessage status="error" message={error} />

        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
