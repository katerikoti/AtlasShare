import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { MapAttribution } from "@/components/map/map-attribution";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${brand.name} stores, who can see it, and how to remove it.`,
  alternates: { canonical: "/privacy" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line/80 pt-8">
      <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
        {title}
      </h2>
      <div className="mt-3 space-y-4 text-[15px] leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-10 sm:py-20">
      <Link
        href="/"
        className="text-sm font-medium text-moss underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink"
      >
        ← Back to home
      </Link>

      <header className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Privacy
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl leading-[1.02] tracking-tight text-balance sm:text-5xl">
          Privacy, in plain language.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
          {brand.name} is a private country map. This page describes what the
          app actually stores, who can see it, and what you can remove. It is a
          product description, not a legal contract.
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Last updated 28 October 2026.
        </p>
      </header>

      <div className="mt-10 rounded-card border border-moss/30 bg-moss/10 p-6">
        <h2 className="font-display text-2xl tracking-tight">The short version</h2>
        <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-ink sm:grid-cols-2">
          <li>No analytics, tracking pixels, ad networks, or public profiles.</li>
          <li>No location tracking, cities, routes, photos, or trip journals.</li>
          <li>Your personal map is visible only to your account.</li>
          <li>Shared maps are visible only to their members.</li>
          <li>Image exports contain country marks, not identities.</li>
          <li>Signing out clears private runtime caches on this device.</li>
        </ul>
      </div>

      <div className="mt-10 space-y-8">
        <Section title="What the app stores">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Your account:</strong> name, email
              address, a password hash rather than the password itself, account
              creation time, whether your email address has been verified, and
              whether a welcome email was attempted.
            </li>
            <li>
              <strong className="text-ink">Verification codes:</strong> to
              confirm your email address when you sign up, we email you a
              6-digit code. Only a hash of the code is stored, it stops working
              after 10 minutes or 5 wrong tries, and it can be used once. An
              account whose address is never verified cannot sign in; it stays
              stored until someone signs up again with the same address, which
              replaces it.
            </li>
            <li>
              <strong className="text-ink">Your map:</strong> the country codes
              you mark as visited. The product does not ask for notes, visit
              dates, cities, routes, coordinates, or photos.
            </li>
            <li>
              <strong className="text-ink">Shared maps:</strong> the map name,
              optional description, memberships, roles, and pending invitation
              addresses. Only a hash of an invitation token is stored.
            </li>
            <li>
              <strong className="text-ink">Sessions:</strong> the session record
              that keeps you signed in, its expiry, and the IP address and
              browser user agent that the authentication system records.
            </li>
          </ul>
        </Section>

        <Section title="Who can see what">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Only you can see your personal map and account settings. Other
              people cannot look it up by guessing a URL.
            </li>
            <li>
              Members of a shared map can see each other&apos;s display names,
              country marks, and combined or per-member country counts. They do
              not receive email addresses, account ids, or account settings.
            </li>
            <li>
              A shared-map owner can see pending invitation email addresses and
              revoke those invitations. The invited person sees the map name
              only after the invitation checks pass.
            </li>
            <li>
              An exported image contains country marks and public brand
              information only. On a shared map it contains the combined marks,
              or the selected member&apos;s marks, but never member names,
              emails, account ids, the map name, per-member breakdowns, notes,
              visit dates, or other account metadata.
            </li>
          </ul>
        </Section>

        <Section title="Cookies and sessions">
          <p>
            A session cookie keeps you signed in. It is HTTP-only and
            SameSite=Lax, and it is marked Secure when the app runs over HTTPS.
            There are no advertising or analytics cookies.
          </p>
          <p>
            The app uses server-side authorization for private pages and
            actions. Hiding a button is not treated as a security boundary.
          </p>
        </Section>

        <Section title="Email">
          <p>
            Account email is sent through Brevo for verification codes, welcome
            messages, password resets, and shared-map invitations. {brand.name}{" "}
            does not add tracking pixels and does not include other members&apos;
            email addresses in those messages.
          </p>
          <p>
            Brevo processes delivery and may record its own delivery or open
            telemetry, and it adds an unsubscribe header that some mail clients
            display. Those records are governed by Brevo&apos;s terms and
            retention policy. Clicking unsubscribe can suppress future
            transactional email from this sender.
          </p>
        </Section>

        <Section title="Offline use and device caches">
          <p>
            The installable app uses a service worker to keep the public app
            shell, public static assets, and a standalone offline page on your
            device. It does not cache authenticated HTML, <code>/api/*</code>{" "}
            responses, invitation responses, or any response marked private.
          </p>
          <p>
            When a navigation cannot reach the network, you see the public
            offline page. No map or account data is replayed from a cache.
            Signing out clears the runtime cache on this device as an extra
            safeguard.
          </p>
        </Section>

        <Section title="Analytics and third parties">
          <p>
            The app runs no product analytics, advertising scripts, tracking
            pixels, or social login. The infrastructure needed to run the
            service — hosting, the PostgreSQL database, and Brevo for email —
            processes data on the operator&apos;s behalf. There is no separate
            analytics profile.
          </p>
        </Section>

        <Section title="Retention and deletion">
          <p>
            Account data stays until you delete the account. Deleting your
            account removes your visits, sessions, and memberships, and deletes
            shared maps you own. That action cannot be undone. Email-delivery
            records held by Brevo follow Brevo&apos;s retention policy.
          </p>
          <p>
            You can change your display name, change your password, and delete
            your account from the{" "}
            <Link
              href="/account"
              className="font-medium text-moss underline underline-offset-2"
            >
              account page
            </Link>
            .
          </p>
        </Section>

        <section id="map-data" className="border-t border-line/80 pt-8">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            About the map data
          </h2>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-muted">
            <p>
              Country geometry is based on{" "}
              <a
                href="https://github.com/VictorCazanave/svg-maps"
                className="font-medium text-moss underline underline-offset-2"
              >
                @svg-maps/world
              </a>{" "}
              (CC BY 4.0), filtered to the 193 UN member states plus the Holy See and Palestine.
            </p>
            <p>
              Boundaries follow the source data and are not a statement about disputed territories.
              Read the{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="font-medium text-moss underline underline-offset-2"
              >
                licence
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
