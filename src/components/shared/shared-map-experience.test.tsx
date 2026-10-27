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

function chooseInsight(name: "Visited by everyone" | "Only you" | "Not yet by anyone") {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
}

function chooseOnlyMember(name: string) {
  fireEvent.click(screen.getByRole("checkbox", { name: "All" }));
  fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(name) }));
}

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
      screen.getByRole("button", { name: /visited by everyone/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /only you/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /not yet by anyone/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /visited by everyone/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("By region")).toBeInTheDocument();
    expect(screen.getByText("3 of 44")).toBeInTheDocument();
  });

  it("shows countries marked only by the current member", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });

    chooseInsight("Only you");

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

    chooseInsight("Not yet by anyone");

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /not yet marked by anyone/i }),
      ).toBeVisible();
    });
    expect(screen.getByRole("heading", { name: "Shared map" })).toBeVisible();
    expect(
      screen.getByText("Countries no member has marked yet."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Not marked yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Marked by someone")).not.toBeInTheDocument();

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
    chooseInsight("Only you");

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
    chooseOnlyMember("Ben");

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

    chooseOnlyMember("Ben");

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
    expect(screen.getByRole("checkbox", { name: "Ben" })).toBeInTheDocument();
  });

  it("summarizes members, countries, and percentage before the map", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });

    const summary = within(
      screen.getByRole("region", { name: /combined progress/i }),
    );
    expect(summary.getByText("2 members ·", { exact: false })).toBeInTheDocument();
    expect(summary.getByText("1.5% of the world", { exact: false })).toBeInTheDocument();
    expect(
      summary.getByRole("progressbar", { name: /countries in this view/i }),
    ).toHaveAttribute("aria-valuenow", "3");
    expect(summary.getByText("Show more")).toBeInTheDocument();
  });

  it("keeps all members checked by default and renders the members panel", async () => {
    render(
      <SharedMapExperience
        map={map}
        membersPanel={<p>Invite someone panel</p>}
      />,
    );
    await screen.findByRole("img", { name: /marked by any member/i });

    expect(screen.getByRole("checkbox", { name: "All" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Ada/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Ben" })).toBeChecked();
    expect(screen.getByText("Invite someone panel")).toBeInTheDocument();
  });

  it("returns to the combined view when a comparison is toggled off", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });

    chooseInsight("Only you");
    await screen.findByRole("img", { name: /marked by only you/i });
    expect(screen.getByRole("button", { name: /only you/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    chooseInsight("Only you");
    expect(
      await screen.findByRole("img", { name: /marked by any member/i }),
    ).toBeVisible();
  });

  it("returns to the combined view when members are changed after a comparison", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });

    chooseInsight("Not yet by anyone");
    await screen.findByRole("img", { name: /not yet marked by anyone/i });

    fireEvent.click(screen.getByRole("checkbox", { name: "Ben" }));

    expect(
      await screen.findByRole("img", { name: /marked by Ada/i }),
    ).toBeVisible();
  });

  it("treats a one-member map with All checked as the combined view", async () => {
    const solo = {
      ...map,
      memberCount: 1,
      members: [map.members[0]],
      combinedCountries: [
        { code: "SE", count: 1 },
        { code: "NO", count: 1 },
      ],
      combinedCount: 2,
    } satisfies SharedMapView;
    render(<SharedMapExperience map={solo} />);

    expect(
      await screen.findByRole("img", { name: /marked by any member/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: /combined progress/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 member ·", { exact: false })).toBeInTheDocument();
  });

  it("hides the export preview until the rose Preview button is pressed", async () => {
    const { container } = render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by any member/i });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled();
    });

    const exportSvg = container.querySelector("[data-export-map]");
    expect(exportSvg).toBeInTheDocument();
    expect(exportSvg).not.toBeVisible();
    expect(screen.queryByText(/never includes member names/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(exportSvg).toBeVisible();
    expect(screen.getByRole("button", { name: "Hide preview" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
