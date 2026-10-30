"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { inviteToSharedMapAction } from "@/server/actions/shared-maps";
import type { InvitationActionState } from "@/server/actions/types";
import {
  Field,
  FormMessage,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/form";

const initialState: InvitationActionState = { status: "idle" };

export function InviteMemberForm({ mapId }: { mapId: string }) {
  const [state, action, pending] = useActionState(
    inviteToSharedMapAction,
    initialState,
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const emailId = useId();
  const linkId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  async function copyLink() {
    if (!state.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopyStatus("Link copied.");
    } catch {
      setCopyStatus("Could not copy automatically. Select the link to copy it.");
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-5 max-w-xl"
      onSubmit={() => setCopyStatus(null)}
    >
      <input type="hidden" name="mapId" value={mapId} />
      <Field
        label="Invite by email"
        htmlFor={emailId}
        hint="One address at a time. The link expires in 7 days and only works for this address."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={emailId}
            name="email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            className={`${inputClass} sm:mt-2`}
            placeholder="traveller@example.com"
          />
          <button
            type="submit"
            disabled={pending}
            className={`${primaryButtonClass} mt-2 shrink-0 sm:w-auto`}
          >
            {pending ? "Inviting…" : "Invite"}
          </button>
        </div>
      </Field>

      <div className="mt-3 space-y-3">
        <FormMessage status={state.status} message={state.message} />
        {state.inviteUrl ? (
          <div className="rounded-xl border border-moss/30 bg-moss/10 p-4">
            <label
              htmlFor={linkId}
              className="block text-xs font-semibold uppercase tracking-[0.16em] text-moss"
            >
              Copyable invitation link
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id={linkId}
                value={state.inviteUrl}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-line bg-canvas/70 px-3 py-2 font-mono text-xs text-ink"
              />
              <button
                type="button"
                onClick={copyLink}
                className={`${secondaryButtonClass} shrink-0`}
              >
                Copy link
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Send this only to {state.invitedEmail ?? "the invited address"}. It
              cannot be redeemed by a different signed-in email.
            </p>
            <p
              role="status"
              aria-live="polite"
              className="mt-2 min-h-4 text-xs font-medium text-moss"
            >
              {copyStatus}
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
