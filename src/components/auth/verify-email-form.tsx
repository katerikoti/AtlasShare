"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  Field,
  FormMessage,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/form";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

const codeErrors: Record<string, string> = {
  INVALID_OTP: "That code is not correct. Check it and try again.",
  OTP_EXPIRED: "That code has expired. Send a new code.",
  TOO_MANY_ATTEMPTS: "Too many wrong tries. Send a new code.",
};

type VerifyEmailFormProps = {
  email: string;
  /** Where to go once verified (an already-validated same-origin path). */
  next: string | null;
  /** Return to the form that led here, to use a different address. */
  onBack: () => void;
};

/**
 * Second step of sign-up (and of signing in to an account that was never
 * verified): the person types the 6-digit code that was emailed. A correct code
 * verifies the address and signs them in.
 */
export function VerifyEmailForm({ email, next, onBack }: VerifyEmailFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setNotice(undefined);

    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      return;
    }

    setPending(true);
    const { error: verifyError } = await authClient.emailOtp.verifyEmail({
      email,
      otp: code,
    });
    setPending(false);

    if (verifyError) {
      setError(
        (verifyError.code && codeErrors[verifyError.code]) ||
          "We could not verify that code. Try again or send a new one.",
      );
      return;
    }

    router.replace(next ?? "/map");
    router.refresh();
  }

  async function onResend() {
    setError(undefined);
    setNotice(undefined);
    setCooldown(RESEND_SECONDS);

    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });

    if (sendError) {
      setError("We could not send a new code just now. Wait a moment and try again.");
      return;
    }
    setCode("");
    setNotice("A new code is on its way. Older codes no longer work.");
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
        Check your email
      </h1>
      <p className="mt-3 text-ink-muted">
        We sent a {CODE_LENGTH}-digit code to{" "}
        <span className="break-all font-medium text-ink">{email}</span>. Enter it
        to finish setting up your account. It can take a minute to arrive; check
        your spam folder too.
      </p>

      <form onSubmit={onSubmit} method="post" className="mt-8 space-y-5" noValidate>
        <Field label="Verification code" htmlFor="code">
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={CODE_LENGTH}
            required
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))
            }
            className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
            placeholder="······"
            disabled={pending}
            autoFocus
          />
        </Field>

        <FormMessage status="error" message={error} />
        <FormMessage status="idle" message={notice} />

        <button
          type="submit"
          className={primaryButtonClass}
          disabled={pending || code.length !== CODE_LENGTH}
        >
          {pending ? "Checking…" : "Verify and continue"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onResend()}
          disabled={cooldown > 0 || pending}
          className={secondaryButtonClass}
        >
          {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-moss underline decoration-moss/40 underline-offset-4 hover:text-ink"
        >
          Use a different email
        </button>
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Already verified?{" "}
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
