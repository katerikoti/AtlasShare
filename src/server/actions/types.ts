export type AccountActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type VisitedCountryActionState =
  | { ok: true; visited: boolean }
  | { ok: false; message: string };
