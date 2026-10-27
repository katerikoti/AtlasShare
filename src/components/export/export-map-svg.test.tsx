import { readFileSync } from "node:fs";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createExportMapInput } from "@/lib/export-map";
import type { MapGeometry } from "@/components/map/use-map-geometry";
import { ExportMapSvg } from "./export-map-svg";

const geometry = JSON.parse(
  readFileSync("public/map/countries.json", "utf8"),
) as MapGeometry;

afterEach(() => {
  cleanup();
});

describe("ExportMapSvg", () => {
  it("renders every country and only the supplied visits", () => {
    const input = createExportMapInput({
      visited: ["SE", "JP", "SE", "AQ"],
      displayName: "My travels",
      year: 2026,
    });
    const { container } = render(
      <ExportMapSvg geometry={geometry} input={input} />,
    );
    const svg = container.querySelector("[data-export-map]");

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute(
      "aria-label",
      "Exported map: 2 of 195 countries visited.",
    );
    expect(container.querySelectorAll("path[data-country]")).toHaveLength(195);
    expect(
      container.querySelector('[data-country="SE"]'),
    ).toHaveAttribute("data-visited", "true");
    expect(
      container.querySelector('[data-country="JP"]'),
    ).toHaveAttribute("data-visited", "true");
    expect(
      container.querySelector('[data-country="FR"]'),
    ).toHaveAttribute("data-visited", "false");
    expect(container.querySelector('[data-country="AQ"]')).toBeNull();
    expect(container).toHaveTextContent("2");
    expect(container).toHaveTextContent("of 195 countries");
    expect(container).toHaveTextContent("Made with AtlasShare · 2026");
  });

  it("works with zero visits and with every country visited", () => {
    const empty = createExportMapInput({ visited: [], year: 2026 });
    const emptyRender = render(
      <ExportMapSvg geometry={geometry} input={empty} />,
    );

    expect(emptyRender.container.querySelector("[data-export-map]")).toHaveAttribute(
      "aria-label",
      "Exported map: 0 of 195 countries visited.",
    );
    expect(
      emptyRender.container.querySelectorAll('[data-visited="true"]'),
    ).toHaveLength(0);

    const all = createExportMapInput({
      visited: Object.keys(geometry.paths),
      year: 2026,
    });
    const allRender = render(
      <ExportMapSvg geometry={geometry} input={all} />,
    );

    expect(all.count).toBe(195);
    expect(allRender.container.querySelectorAll('[data-visited="true"]')).toHaveLength(
      195,
    );
  });

  it("uses the optional display name and contains no external assets", () => {
    const input = createExportMapInput({
      visited: ["VA"],
      displayName: "Ada's travels",
      year: 2026,
    });
    const { container } = render(
      <ExportMapSvg geometry={geometry} input={input} />,
    );

    expect(container).toHaveTextContent("Ada's travels");
    expect(container.querySelector("image")).toBeNull();
    expect(container.querySelector("foreignObject")).toBeNull();
    expect(container.querySelector("[href]")).toBeNull();
  });

  it("renders a user-supplied title as text, never markup", () => {
    const input = createExportMapInput({
      visited: ["SE"],
      displayName: "<script>alert(1)</script> & co",
      year: 2026,
    });
    const { container } = render(
      <ExportMapSvg geometry={geometry} input={input} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container).toHaveTextContent("<script>alert(1)</script> & co");
  });
});
