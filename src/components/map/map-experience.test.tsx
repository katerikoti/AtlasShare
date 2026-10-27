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
    expect(await screen.findByRole("img", { name: /world map/i })).toBeVisible();
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
  });

  it("filters by visited state, region, and resets the controls", async () => {
    render(<MapExperience initialVisited={["SE"]} />);
    await screen.findByRole("img", { name: /world map/i });

    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "visited" },
    });

    expect(screen.getByRole("checkbox", { name: /sweden/i })).toBeVisible();
    expect(
      screen.queryByRole("checkbox", { name: /norway/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 250")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "Asia" },
    });
    expect(screen.getByText("No countries match these filters.")).toBeVisible();

    fireEvent.click(
      screen.getAllByRole("button", { name: /reset filters/i })[0],
    );

    expect(screen.getByLabelText("Show")).toHaveValue("all");
    expect(screen.getByLabelText("Region")).toHaveValue("all");
    expect(screen.getByText("Showing 250 of 250")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /japan/i })).toBeVisible();
  });

  it("sorts visited countries first", async () => {
    render(<MapExperience initialVisited={["JP"]} />);
    await screen.findByRole("img", { name: /world map/i });

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "visited" },
    });

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toHaveAccessibleName(/japan/i);
    expect(checkboxes[1]).toHaveAccessibleName(/afghanistan/i);
  });

  it("shows region statistics that follow the visited set", async () => {
    render(<MapExperience initialVisited={["SE", "NO"]} />);

    expect(screen.getByText("By region")).toBeInTheDocument();
    expect(screen.getByText("0 of 59")).toBeInTheDocument();
    expect(screen.getByText("2 of 52")).toBeInTheDocument();
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
    expect(screen.getByRole("checkbox", { name: /sweden/i })).toBeChecked();
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
