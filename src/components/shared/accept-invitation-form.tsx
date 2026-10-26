"use client";

import { useActionState } from "react";

import { acceptInvitationAction } from "@/server/actions/shared-maps";
import type { SharedMapActionState } from "@/server/actions/types";
import {
  FormMessage,
  primaryButtonClass,
} from "@/components/ui/form";

const initialState: SharedMapActionState = { status: "idle" };

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    acceptInvitationAction,
    initialState,
  );

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-3">
        <FormMessage status={state.status} message={state.message} />
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Joining…" : "Join this shared map"}
        </button>
      </div>
    </form>
  );
}
