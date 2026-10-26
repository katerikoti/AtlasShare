"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/form";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    setPending(true);
    // The response is intentionally ignored: it must not reveal whether the
    // address exists. Errors (including a failed email send) look the same.
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/sign-in",
    });
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          Check your email
        </h1>
        <p className="mt-4 text-ink-muted">
          If an account exists for that address, a reset link is on its way. The
          link expires in one hour and works once.
        </p>
        <div className="mt-7 flex flex-col gap-3 text-sm">
          <Link
            href="/sign-in"
            className="font-medium text-moss underline decoration-moss/40 underline-offset-4 hover:text-ink"
          >
            Back to sign in
          </Link>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="self-start text-ink-muted underline decoration-line underline-offset-4 hover:text-ink"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
        Reset your password
      </h1>
      <p className="mt-3 text-ink-muted">
        Enter the email on your account and we will send a single-use reset
        link.
      </p>

      <form onSubmit={onSubmit} method="post" className="mt-8 space-y-5" noValidate>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            className={inputClass}
            placeholder="you@example.com"
            disabled={pending}
          />
        </Field>

        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-moss underline decoration-moss/40 underline-offset-4 hover:text-ink"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
