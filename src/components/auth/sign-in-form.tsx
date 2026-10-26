"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/safe-redirect";
import {
  Field,
  FormMessage,
  inputClass,
  primaryButtonClass,
} from "@/components/ui/form";

export function SignInForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);
    const { error: authError } = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
    });
    setPending(false);

    if (authError) {
      // Deliberately generic: do not reveal whether the email exists.
      setError("Email or password is incorrect.");
      return;
    }

    router.replace(next ?? "/account");
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
        Welcome back
      </h1>
      <p className="mt-3 text-ink-muted">
        Sign in to see your map and the maps you share.
      </p>

      <Suspense fallback={null}>
        <PasswordChangedNotice />
      </Suspense>

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

        <Field label="Password" htmlFor="password">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            className={inputClass}
            disabled={pending}
          />
        </Field>

        <FormMessage status="error" message={error} />

        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-ink-muted">
        <p>
          New here?{" "}
          <Link
            href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-moss underline decoration-moss/40 underline-offset-4 hover:text-ink"
          >
            Create an account
          </Link>
        </p>
        <p>
          <Link
            href="/forgot-password"
            className="text-moss underline decoration-moss/40 underline-offset-4 hover:text-ink"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Reads the post-password-change notice on the client so the sign-in page can
 * stay statically rendered while still showing request-specific feedback.
 */
function PasswordChangedNotice() {
  const params = useSearchParams();
  if (params.get("passwordChanged") !== "1") return null;

  return (
    <div className="mt-6">
      <FormMessage
        status="success"
        message="Password changed. Sign in with your new password."
      />
    </div>
  );
}
