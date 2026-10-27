import { readFileSync } from "node:fs";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SharedMapView } from "@/server/shared-maps";
import { SharedMapExperience } from "./shared-map-experience";

const geometry = readFileSync("public/map/countries.json", "utf8");

const map = {
  id: "map_1",
  name: "Nordics",
  description: null,
  role: "OWNER",
  memberCount: 2,
  combinedCount: 3,
  combinedCountries: [
    { code: "SE", count: 2 },
    { code: "NO", count: 1 },
    { code: "FR", count: 1 },
  ],
  members: [
    {
      id: "member_a",
      name: "Ada",
      role: "OWNER",
      isCurrentUser: true,
      count: 2,
      countries: ["SE", "NO"],
    },
    {
      id: "member_b",
      name: "Ben",
      role: "MEMBER",
      isCurrentUser: false,
      count: 2,
      countries: ["SE", "FR"],
    },
  ],
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-02T00:00:00.000Z"),
} satisfies SharedMapView;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(geometry, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SharedMapExperience", () => {
  it("shows the combined count and aggregate per-country counts", async () => {
    render(<SharedMapExperience map={map} />);

    expect(
      await screen.findByRole("img", { name: /marked by any member/i }),
    ).toBeVisible();
    expect(
      screen.getByText("countries marked by any member", { selector: "p" }),
    ).toBeInTheDocument();

    const list = within(
      screen.getByRole("region", { name: /countries in this view/i }),
    );
    expect(list.getByText("Sweden")).toBeInTheDocument();
    expect(list.getByText("Norway")).toBeInTheDocument();
    expect(list.getByText("France")).toBeInTheDocument();
    expect(list.getByText("2 of 2")).toBeInTheDocument();
    expect(list.getByText("3 of 195 marked")).toBeInTheDocument();
  });

  it("summarizes comparison counts and the current view by region", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });

    expect(
      screen.getByRole("option", { name: /visited by everyone · 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /only you · 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /not yet by anyone · 192/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Visited by everyone", { selector: "dt" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This view by region")).toBeInTheDocument();
    expect(screen.getByText("3 of 44")).toBeInTheDocument();
  });

  it("shows countries marked only by the current member", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });

    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "only-you" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /marked by only you/i }),
      ).toBeVisible();
    });
    expect(
      screen.getByText("countries marked only by you", { selector: "p" }),
    ).toBeInTheDocument();

    const list = within(
      screen.getByRole("region", { name: /countries in this view/i }),
    );
    expect(list.getByText("Norway")).toBeInTheDocument();
    expect(list.queryByText("Sweden")).not.toBeInTheDocument();
    expect(list.queryByText("France")).not.toBeInTheDocument();
    expect(list.getByText("1 of 195 marked")).toBeInTheDocument();
  });

  it("shows countries nobody has marked yet", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });

    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "nobody" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /not yet marked by anyone/i }),
      ).toBeVisible();
    });
    expect(screen.getByRole("heading", { name: "Shared map" })).toBeVisible();
    expect(
      screen.getByText("Countries no member has marked yet."),
    ).toBeInTheDocument();
    expect(screen.getByText("Not marked yet")).toBeInTheDocument();
    expect(screen.getByText("Marked by someone")).toBeInTheDocument();

    const list = within(
      screen.getByRole("region", { name: /countries in this view/i }),
    );
    expect(list.getByText("192 of 195 not marked yet")).toBeInTheDocument();
    expect(list.queryByText("Sweden")).not.toBeInTheDocument();
    expect(list.getByText("Japan")).toBeInTheDocument();
  });

  it("exports the combined shared map without member identities", async () => {
    const { container } = render(<SharedMapExperience map={map} />);

    await waitFor(() => {
      expect(container.querySelector("[data-export-map]")).toBeInTheDocument();
    });

    const exportSvg = container.querySelector("[data-export-map]");
    expect(exportSvg).toHaveAttribute(
      "aria-label",
      "Exported map: 3 of 195 countries visited.",
    );
    for (const code of ["SE", "NO", "FR"]) {
      expect(
        exportSvg?.querySelector(`[data-country="${code}"]`),
      ).toHaveAttribute("data-visited", "true");
    }
    expect(exportSvg?.textContent).not.toContain("Ada");
    expect(exportSvg?.textContent).not.toContain("Ben");
    expect(exportSvg?.textContent).not.toContain("Nordics");
    expect(exportSvg?.textContent).toContain("Our travels");
    expect(
      screen.getByText(/combined shared map/i),
    ).toBeInTheDocument();
  });

  it("keeps the combined export when a comparison view is selected", async () => {
    const { container } = render(<SharedMapExperience map={map} />);

    await screen.findByRole("img", { name: /marked by any member/i });
    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "only-you" },
    });

    await waitFor(() => {
      expect(container.querySelector("[data-export-map]")).toHaveAttribute(
        "aria-label",
        "Exported map: 3 of 195 countries visited.",
      );
    });
    expect(
      container
        .querySelector("[data-export-map]")
        ?.querySelector('[data-country="FR"]'),
    ).toHaveAttribute("data-visited", "true");
  });

  it("exports a selected member's map without their name", async () => {
    const { container } = render(<SharedMapExperience map={map} />);

    await screen.findByRole("img", { name: /marked by any member/i });
    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "member:member_b" },
    });

    await waitFor(() => {
      expect(container.querySelector("[data-export-map]")).toHaveAttribute(
        "aria-label",
        "Exported map: 2 of 195 countries visited.",
      );
    });

    const exportSvg = container.querySelector("[data-export-map]");
    expect(
      exportSvg?.querySelector('[data-country="SE"]'),
    ).toHaveAttribute("data-visited", "true");
    expect(
      exportSvg?.querySelector('[data-country="FR"]'),
    ).toHaveAttribute("data-visited", "true");
    expect(
      exportSvg?.querySelector('[data-country="NO"]'),
    ).toHaveAttribute("data-visited", "false");
    expect(exportSvg?.textContent).not.toContain("Ben");
    expect(exportSvg?.textContent).toContain("Their travels");
    expect(
      screen.getByText(/selected member's map/i),
    ).toBeInTheDocument();
  });

  it("filters to one member without exposing mutation controls", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });

    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "member:member_b" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /marked by Ben/i }),
      ).toBeVisible();
    });
    expect(
      screen.getByText("countries marked by Ben", { selector: "p" }),
    ).toBeInTheDocument();

    const list = within(
      screen.getByRole("region", { name: /countries in this view/i }),
    );
    expect(list.getByText("Sweden")).toBeInTheDocument();
    expect(list.getByText("France")).toBeInTheDocument();
    expect(list.queryByText("Norway")).not.toBeInTheDocument();
    expect(list.getByText("2 of 195 marked")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
