"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

type NavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: () => ReactElement;
};

function Svg({ children }: { children: ReactElement | ReactElement[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function HomeIcon() {
  return (
    <Svg>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

function PeopleIcon() {
  return (
    <Svg>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14c2.8 0 4.5 1.8 4.5 4.5" />
    </Svg>
  );
}

function SettingsIcon() {
  return (
    <Svg>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

const home: NavItem = {
  href: "/map",
  label: "Home",
  isActive: (pathname) => pathname === "/map",
  icon: HomeIcon,
};

const shared: NavItem = {
  href: "/shared",
  label: "Shared",
  isActive: (pathname) =>
    pathname === "/shared" || pathname.startsWith("/shared/"),
  icon: PeopleIcon,
};

const account: NavItem = {
  href: "/account",
  label: "Account",
  isActive: (pathname) =>
    pathname === "/account" || pathname.startsWith("/account/"),
  icon: SettingsIcon,
};

/** Top-bar links shown from the `sm` breakpoint up. */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="ml-2 hidden items-center gap-1 sm:flex"
    >
      {[home, shared, account].map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-canvas/70 hover:text-ink ${
              active ? "bg-rose/35 text-ink" : "text-ink-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * App-style bottom tab bar for phones: Shared on the left, Home in the middle,
 * Account on the right. It is fixed to the bottom and respects the device's
 * safe area (the iPhone home indicator).
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main tabs"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-canvas/95 pb-[max(env(safe-area-inset-bottom),0px)] backdrop-blur-sm supports-[backdrop-filter]:bg-canvas/80 sm:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {[shared, home, account].map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-moss ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                    active ? "bg-rose/45" : ""
                  }`}
                >
                  <Icon />
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
