import { describe, expect, it } from "vitest";

import { brand } from "./brand";

/** WCAG relative luminance for a #rrggbb color. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return (
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)
  );
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("brand", () => {
  it("uses the agreed product name everywhere it is centralised", () => {
    expect(brand.name).toBe("AtlasShare");
    expect(brand.shortName).toBe("AtlasShare");
    expect(brand.tagline.length).toBeGreaterThan(0);
  });

  it("keeps body text readable on the primary surfaces", () => {
    expect(contrast(brand.palette.ink, brand.palette.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(brand.palette.ink, brand.palette.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(brand.palette.ink, brand.palette.rose)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps secondary text readable on the canvas", () => {
    expect(contrast(brand.palette.inkMuted, brand.palette.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps moss labels readable on the canvas", () => {
    expect(contrast(brand.palette.moss, brand.palette.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps non-text map borders distinguishable from the map base", () => {
    // WCAG 1.4.11 asks for 3:1 for graphical objects and UI components.
    expect(contrast(brand.palette.moss, brand.palette.map)).toBeGreaterThanOrEqual(3);
  });
});
