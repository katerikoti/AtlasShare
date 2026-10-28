import { describe, expect, it } from "vitest";

import {
  clampView,
  formatViewBox,
  MAX_SCALE,
  panBy,
  parseViewBox,
  scaleOf,
  zoomAt,
} from "./map-zoom";

const base = { x: 0, y: 0, w: 1010, h: 760 };

describe("map zoom math", () => {
  it("parses and formats a view box", () => {
    expect(parseViewBox("0 0 1010 760")).toEqual(base);
    expect(parseViewBox("0,0,1010,760")).toEqual(base);
    expect(formatViewBox({ x: 1.23456, y: 0, w: 505, h: 380 })).toBe(
      "1.235 0 505 380",
    );
  });

  it("rejects malformed view boxes", () => {
    expect(parseViewBox("")).toBeNull();
    expect(parseViewBox("0 0 10")).toBeNull();
    expect(parseViewBox("0 0 nope 5")).toBeNull();
    expect(parseViewBox("0 0 0 5")).toBeNull();
  });

  it("zooms about the centre and keeps the view inside the map", () => {
    const zoomed = zoomAt(base, base, 2);

    expect(scaleOf(base, zoomed)).toBeCloseTo(2);
    expect(zoomed.x).toBeCloseTo(252.5);
    expect(zoomed.y).toBeCloseTo(190);
    expect(zoomed.w).toBeCloseTo(505);
  });

  it("keeps the point under the cursor fixed while zooming", () => {
    const fx = 0.25;
    const fy = 0.75;
    const before = { x: base.x + fx * base.w, y: base.y + fy * base.h };
    const zoomed = zoomAt(base, base, 2, fx, fy);
    const after = { x: zoomed.x + fx * zoomed.w, y: zoomed.y + fy * zoomed.h };

    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("never zooms out past the full map or in past the limit", () => {
    expect(zoomAt(base, base, 0.1)).toEqual(base);
    expect(scaleOf(base, zoomAt(base, base, 1000))).toBeCloseTo(MAX_SCALE);
  });

  it("zooming out from a corner returns to the full map", () => {
    const corner = zoomAt(base, base, 4, 0, 0);
    expect(corner.x).toBeCloseTo(0);
    expect(zoomAt(base, corner, 0.25, 0, 0)).toEqual(base);
  });

  it("pans with the drag and stops at the map edges", () => {
    const zoomed = zoomAt(base, base, 2);
    const dragged = panBy(base, zoomed, 0.1, 0);
    expect(dragged.x).toBeCloseTo(zoomed.x - 0.1 * zoomed.w);

    const farLeft = panBy(base, zoomed, -10, -10);
    expect(farLeft.x).toBeCloseTo(base.w - zoomed.w);
    expect(farLeft.y).toBeCloseTo(base.h - zoomed.h);

    const farRight = panBy(base, zoomed, 10, 10);
    expect(farRight.x).toBeCloseTo(0);
    expect(farRight.y).toBeCloseTo(0);
  });

  it("does not pan the unzoomed map", () => {
    expect(panBy(base, base, 0.5, 0.5)).toEqual(base);
  });

  it("clamps an out-of-range view", () => {
    expect(clampView(base, { x: -50, y: -50, w: 2000, h: 1500 })).toEqual(base);
  });
});
