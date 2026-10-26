export type AccountActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};
