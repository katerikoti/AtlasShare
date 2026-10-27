import type { ReactNode } from "react";

export const inputClass =
  "mt-2 block w-full rounded-xl border border-line bg-canvas/60 px-4 py-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-muted/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 disabled:opacity-60";

export const selectClass =
  "mt-1.5 block w-full rounded-xl border border-line bg-canvas/60 px-3 py-2 text-sm text-ink shadow-sm transition-colors focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 disabled:opacity-60";

export const primaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-full bg-moss px-5 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-ink focus-visible:bg-ink disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-moss/35 px-4 py-2 text-sm font-medium text-moss transition-colors hover:border-moss hover:bg-canvas/70 disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-ink"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormMessage({
  status,
  message,
}: {
  status: "idle" | "error" | "success";
  message?: string;
}) {
  if (!message) return null;

  return (
    <p
      role={status === "error" ? "alert" : "status"}
      className={`rounded-xl border px-3.5 py-2.5 text-sm ${
        status === "error"
          ? "border-rose-deep/40 bg-rose/25 text-ink"
          : "border-moss/30 bg-moss/10 text-moss"
      }`}
    >
      {message}
    </p>
  );
}
