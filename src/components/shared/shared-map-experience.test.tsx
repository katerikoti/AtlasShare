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
      await screen.findByRole("img", { name: /marked by everyone/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/countries & territories marked by everyone/i),
    ).toBeInTheDocument();

    const list = within(
      screen.getByRole("region", { name: /countries in this view/i }),
    );
    expect(list.getByText("Sweden")).toBeInTheDocument();
    expect(list.getByText("Norway")).toBeInTheDocument();
    expect(list.getByText("France")).toBeInTheDocument();
    expect(list.getByText("2 of 2")).toBeInTheDocument();
    expect(list.getByText("3 of 250 marked")).toBeInTheDocument();
  });

  it("filters to one member without exposing mutation controls", async () => {
    render(<SharedMapExperience map={map} />);
    await screen.findByRole("img", { name: /marked by everyone/i });

    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "member_b" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /marked by Ben/i }),
      ).toBeVisible();
    });
    expect(
      screen.getByText(/countries & territories marked by Ben/i),
    ).toBeInTheDocument();

    const list = within(
      screen.getByRole("region", { name: /countries in this view/i }),
    );
    expect(list.getByText("Sweden")).toBeInTheDocument();
    expect(list.getByText("France")).toBeInTheDocument();
    expect(list.queryByText("Norway")).not.toBeInTheDocument();
    expect(list.getByText("2 of 250 marked")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
