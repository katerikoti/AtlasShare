"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  Field,
  FormMessage,
  inputClass,
  primaryButtonClass,
} from "@/components/ui/form";

export function SignUpForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (password.length < 12) {
      setError("Use at least 12 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    const { error: authError } = await authClient.signUp.email({
      name,
      email,
      password,
    });
    setPending(false);

    if (authError) {
      setError(
        authError.message ||
          "Could not create your account. Check the details and try again.",
      );
      return;
    }

    router.replace("/account");
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
        Create your account
      </h1>
      <p className="mt-3 text-ink-muted">
        Start a private map. You can share it later, one person at a time.
      </p>

      <form onSubmit={onSubmit} method="post" className="mt-8 space-y-5" noValidate>
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={80}
            className={inputClass}
            placeholder="How should we address you?"
            disabled={pending}
          />
        </Field>

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

        <Field
          label="Password"
          htmlFor="password"
          hint="At least 12 characters. A short sentence works well."
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            className={inputClass}
            disabled={pending}
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword">
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
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-moss underline decoration-moss/40 underline-offset-4 hover:text-ink"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
