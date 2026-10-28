import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ZoomableMap } from "./zoomable-map";

function renderMap(onCountryClick = vi.fn()) {
  const view = render(
    <ZoomableMap viewBox="0 0 1010 760" labelledBy="title">
      <title id="title">Test world map</title>
      <path d="M0 0h10v10z" data-country="SE" onClick={onCountryClick} />
    </ZoomableMap>,
  );
  const svg = screen.getByRole("img", { name: "Test world map" });
  const container = svg.parentElement as HTMLElement;
  return { ...view, svg, container, onCountryClick };
}

function pointer(
  target: Element,
  type: "pointerDown" | "pointerMove" | "pointerUp",
  init: { pointerId?: number; clientX: number; clientY: number },
) {
  fireEvent[type](target, {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    ...init,
  });
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1010,
    bottom: 760,
    width: 1010,
    height: 760,
    toJSON: () => ({}),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ZoomableMap", () => {
  it("starts unzoomed with zoom out and reset disabled", () => {
    const { svg } = renderMap();

    expect(svg).toHaveAttribute("viewBox", "0 0 1010 760");
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset zoom" })).toBeDisabled();
  });

  it("zooms in around the centre and resets", () => {
    const { svg } = renderMap();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const [, , width] = (svg.getAttribute("viewBox") ?? "").split(" ").map(Number);
    expect(width).toBeCloseTo(1010 / 1.6, 1);
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
    expect(svg).toHaveAttribute("viewBox", "0 0 1010 760");
    expect(screen.getByRole("button", { name: "Reset zoom" })).toBeDisabled();
  });

  it("stops zooming in at the maximum", () => {
    renderMap();
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });

    for (let step = 0; step < 6; step += 1) fireEvent.click(zoomIn);

    expect(zoomIn).toBeDisabled();
  });

  it("zooms with Ctrl + scroll but leaves a plain scroll to the page", () => {
    const { svg, container } = renderMap();

    const plain = new WheelEvent("wheel", {
      deltaY: -200,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
    expect(svg).toHaveAttribute("viewBox", "0 0 1010 760");

    const zoom = new WheelEvent("wheel", {
      deltaY: -200,
      ctrlKey: true,
      clientX: 505,
      clientY: 380,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      container.dispatchEvent(zoom);
    });
    expect(zoom.defaultPrevented).toBe(true);
    expect(svg.getAttribute("viewBox")).not.toBe("0 0 1010 760");
  });

  it("still lets a plain click reach a country", () => {
    const { onCountryClick } = renderMap();

    fireEvent.click(screen.getByRole("img", { name: "Test world map" }).querySelector("path")!);

    expect(onCountryClick).toHaveBeenCalledTimes(1);
  });

  it("drags to pan once zoomed in and swallows the click after a drag", () => {
    const { svg, container, onCountryClick } = renderMap();
    const country = svg.querySelector("path")!;

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const before = svg.getAttribute("viewBox");

    pointer(container, "pointerDown", { clientX: 500, clientY: 400 });
    pointer(container, "pointerMove", { clientX: 540, clientY: 420 });
    pointer(container, "pointerUp", { clientX: 540, clientY: 420 });
    fireEvent.click(country);

    expect(svg.getAttribute("viewBox")).not.toBe(before);
    expect(onCountryClick).not.toHaveBeenCalled();

    // The next, ordinary click is not swallowed.
    pointer(container, "pointerDown", { clientX: 10, clientY: 10 });
    pointer(container, "pointerUp", { clientX: 10, clientY: 10 });
    fireEvent.click(country);
    expect(onCountryClick).toHaveBeenCalledTimes(1);
  });

  it("does not treat a small jitter as a drag", () => {
    const { svg, container, onCountryClick } = renderMap();
    const country = svg.querySelector("path")!;

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const before = svg.getAttribute("viewBox");

    pointer(container, "pointerDown", { clientX: 500, clientY: 400 });
    pointer(container, "pointerMove", { clientX: 501, clientY: 401 });
    pointer(container, "pointerUp", { clientX: 501, clientY: 401 });
    fireEvent.click(country);

    expect(svg.getAttribute("viewBox")).toBe(before);
    expect(onCountryClick).toHaveBeenCalledTimes(1);
  });
});
