export type AccountActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type VisitedCountryActionState =
  | { ok: true; visited: boolean }
  | { ok: false; message: string };

export type SharedMapActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type InvitationActionState = SharedMapActionState & {
  inviteUrl?: string;
  invitedEmail?: string;
  emailDelivery?: "sent" | "skipped" | "failed";
};
