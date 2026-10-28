import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/map" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

import { DesktopNav, MobileTabBar } from "./app-nav";

afterEach(() => {
  cleanup();
  pathname.value = "/map";
});

const labels = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole("link")
    .map((link) => link.textContent);

describe("app navigation", () => {
  it("lists Home, Shared, Account in the desktop top bar", () => {
    render(<DesktopNav />);

    expect(labels(screen.getByRole("navigation", { name: "Main" }))).toEqual([
      "Home",
      "Shared",
      "Account",
    ]);
  });

  it("puts Shared left, Home in the middle, Account right on the phone tab bar", () => {
    render(<MobileTabBar />);

    const bar = screen.getByRole("navigation", { name: "Main tabs" });
    expect(labels(bar)).toEqual(["Shared", "Home", "Account"]);
    expect(within(bar).getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/map",
    );
    expect(within(bar).getByRole("link", { name: "Shared" })).toHaveAttribute(
      "href",
      "/shared",
    );
    expect(within(bar).getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("marks the current page on both navs", () => {
    pathname.value = "/shared/abc123";
    render(
      <>
        <DesktopNav />
        <MobileTabBar />
      </>,
    );

    for (const name of ["Main", "Main tabs"]) {
      const nav = screen.getByRole("navigation", { name });
      expect(within(nav).getByRole("link", { name: "Shared" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        within(nav).getByRole("link", { name: "Home" }),
      ).not.toHaveAttribute("aria-current");
      expect(
        within(nav).getByRole("link", { name: "Account" }),
      ).not.toHaveAttribute("aria-current");
    }
  });

  it("marks Home on /map and Account on /account", () => {
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    cleanup();

    pathname.value = "/account";
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
