import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setVisitedCountryAction: vi.fn(),
}));

vi.mock("@/server/actions/visits", () => ({
  setVisitedCountryAction: mocks.setVisitedCountryAction,
}));

import { MapExperience } from "./map-experience";

const geometry = readFileSync("public/map/countries.json", "utf8");

function mockMapFetch() {
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
}

function searchInput() {
  return screen.getByLabelText(/find a country/i);
}

beforeEach(() => {
  mockMapFetch();
  mocks.setVisitedCountryAction.mockReset();
  mocks.setVisitedCountryAction.mockResolvedValue({ ok: true, visited: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MapExperience", () => {
  it("renders the server count and an accessible list", async () => {
    render(<MapExperience initialVisited={[]} />);

    expect(
      screen.getByRole("progressbar", { name: /countries marked visited/i }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByLabelText(/find a country/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /sweden/i })).not.toBeChecked();
    expect(screen.queryByLabelText("Show")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sort")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/the map is a visual aid/i),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /world map/i })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Share your map" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Download" }),
    ).toBeEnabled();
  });

  it("keeps the export preview hidden until Preview is pressed", async () => {
    const { container } = render(<MapExperience initialVisited={["SE"]} />);
    await screen.findByRole("img", { name: /world map/i });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled();
    });

    const exportSvg = container.querySelector("[data-export-map]");
    expect(exportSvg).toBeInTheDocument();
    expect(exportSvg).not.toBeVisible();
    expect(screen.queryByText(/never includes your email/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(exportSvg).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Hide preview" }));
    expect(exportSvg).not.toBeVisible();
  });

  it("searches by name and removes non-matching rows", async () => {
    render(<MapExperience initialVisited={[]} />);
    await screen.findByRole("img", { name: /world map/i });

    fireEvent.change(searchInput(), { target: { value: "swe" } });

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /sweden/i })).toBeVisible();
      expect(
        screen.queryByRole("checkbox", { name: /norway/i }),
      ).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput(), { target: { value: "zzzz" } });

    expect(await screen.findByText(/no countries match/i)).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows region statistics that follow the visited set", async () => {
    render(<MapExperience initialVisited={["SE", "NO"]} />);

    expect(screen.getByText("By region")).toBeInTheDocument();
    expect(screen.getByText("0 of 54")).toBeInTheDocument();
    expect(screen.getByText("2 of 44")).toBeInTheDocument();
  });

  it("optimistically marks a country and persists the desired state", async () => {
    mocks.setVisitedCountryAction.mockResolvedValue({
      ok: true,
      visited: true,
    });
    render(<MapExperience initialVisited={[]} />);
    await screen.findByRole("img", { name: /world map/i });

    fireEvent.click(screen.getByRole("checkbox", { name: /sweden/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("progressbar", { name: /countries marked visited/i }),
      ).toHaveAttribute("aria-valuenow", "1");
    });
    const sweden = screen.getByRole("checkbox", { name: /sweden/i });
    expect(sweden).toBeChecked();
    expect(sweden).toHaveClass("accent-rose-deep");
    expect(screen.getByText("Sweden")).toHaveClass("text-rose-deep");
    expect(mocks.setVisitedCountryAction).toHaveBeenCalledWith("SE", true);
  });

  it("rolls back the optimistic change and shows an error when saving fails", async () => {
    mocks.setVisitedCountryAction.mockResolvedValue({
      ok: false,
      message: "Could not save your map. Check your connection and try again.",
    });
    render(<MapExperience initialVisited={["NO"]} />);
    await screen.findByRole("img", { name: /world map/i });

    fireEvent.click(screen.getByRole("checkbox", { name: /norway/i }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Could not save your map");
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /norway/i })).toBeChecked();
      expect(
        screen.getByRole("progressbar", { name: /countries marked visited/i }),
      ).toHaveAttribute("aria-valuenow", "1");
    });
  });
});
