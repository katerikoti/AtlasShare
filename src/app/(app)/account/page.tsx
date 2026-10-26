import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { ChangePasswordForm } from "@/components/account/change-password-form";
import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { NameForm } from "@/components/account/name-form";
import { brand } from "@/config/brand";
import { requireSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Account",
  description: `Manage your ${brand.name} account.`,
};

function Section({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={`rounded-card border p-6 shadow-soft sm:p-8 ${
        tone === "danger"
          ? "border-rose-deep/30 bg-rose/10"
          : "border-line/80 bg-surface/80"
      }`}
    >
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      </div>
      <div className="mt-6 max-w-md">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const session = await requireSession();
  const memberSince = new Intl.DateTimeFormat("en", {
    dateStyle: "long",
  }).format(new Date(session.user.createdAt));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Account
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          {session.user.name}
        </h1>
        <p className="mt-2 text-ink-muted">
          {session.user.email} · Member since {memberSince}
        </p>
      </header>

      <div className="rounded-card border border-moss/30 bg-moss/10 p-5 text-sm leading-relaxed text-ink sm:p-6">
        <p className="font-medium">Your map is live.</p>
        <p className="mt-1 text-ink-muted">
          Mark the countries you have visited on{" "}
          <Link href="/map" className="font-medium text-moss underline underline-offset-2">
            your map
          </Link>
          . Shared maps and image export are built in the phases ahead.
        </p>
      </div>

      <Section
        title="Your details"
        description="This name appears on your account and, later, on maps you share."
      >
        <NameForm name={session.user.name} />
      </Section>

      <Section
        title="Password"
        description="Changing your password signs out every other device. Use at least 12 characters."
      >
        <ChangePasswordForm />
      </Section>

      <Section
        title="Delete account"
        description="Remove your account and all of its private data."
        tone="danger"
      >
        <DeleteAccountForm />
      </Section>

      <p className="text-xs leading-relaxed text-ink-muted">
        Email address changes and email verification are not available yet.
        Your address is never shown to other members.
      </p>
    </div>
  );
}
