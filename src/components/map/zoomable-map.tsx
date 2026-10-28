"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import {
  formatViewBox,
  MAX_SCALE,
  panBy,
  parseViewBox,
  scaleOf,
  zoomAt,
  ZOOM_STEP,
  type ViewRect,
} from "@/lib/map-zoom";

/** A drag shorter than this is still a click, so tapping a country works. */
const DRAG_THRESHOLD_PX = 4;
const WHEEL_SENSITIVITY = 0.01;

const controlClass =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-line/80 bg-surface/90 px-2 text-base font-medium text-ink shadow-soft backdrop-blur-sm transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss disabled:cursor-not-allowed disabled:opacity-40";

type ZoomableMapProps = {
  viewBox: string;
  labelledBy: string;
  children: ReactNode;
};

/**
 * The SVG surface for a world map with zoom and pan. Zoom state lives here, so
 * panning never re-renders the 195 country paths passed in as `children`.
 *
 * Gestures: the +/− buttons, two-finger pinch, Ctrl/⌘ + scroll (plain scroll is
 * left alone so the page still scrolls), and drag to pan once zoomed in. A drag
 * only starts after a few pixels of movement and swallows the click that would
 * follow it, so panning never marks a country.
 */
export function ZoomableMap({ viewBox, labelledBy, children }: ZoomableMapProps) {
  const base = useMemo(() => parseViewBox(viewBox), [viewBox]);
  const [view, setView] = useState<ViewRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({
    startX: 0,
    startY: 0,
    dragging: false,
    suppressClick: false,
    pinchDistance: 0,
  });

  const current = base ? (view ?? base) : null;
  const scale = base && current ? scaleOf(base, current) : 1;
  const zoomed = scale > 1.001;

  const zoom = useCallback(
    (factor: number, fx = 0.5, fy = 0.5) => {
      if (!base) return;
      setView((previous) => zoomAt(base, previous ?? base, factor, fx, fy));
    },
    [base],
  );

  const pan = useCallback(
    (dxFrac: number, dyFrac: number) => {
      if (!base) return;
      setView((previous) => panBy(base, previous ?? base, dxFrac, dyFrac));
    },
    [base],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // React's onWheel is passive, so this needs a native non-passive listener.
    function handleWheel(event: WheelEvent) {
      if (!container || (!event.ctrlKey && !event.metaKey)) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      zoom(
        Math.exp(-event.deltaY * WHEEL_SENSITIVITY),
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height,
      );
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const state = gesture.current;
    if (pointers.current.size === 0) state.suppressClick = false;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.current.size === 1) {
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.dragging = false;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      state.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      state.suppressClick = true;
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;

    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    const state = gesture.current;

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (state.pinchDistance > 0 && distance > 0) {
        zoom(
          distance / state.pinchDistance,
          ((a.x + b.x) / 2 - rect.left) / rect.width,
          ((a.y + b.y) / 2 - rect.top) / rect.height,
        );
      }
      state.pinchDistance = distance;
      // The midpoint of the two fingers moves by half of this finger's move.
      pan(
        (next.x - previous.x) / 2 / rect.width,
        (next.y - previous.y) / 2 / rect.height,
      );
      return;
    }

    if (!state.dragging) {
      const moved = Math.hypot(next.x - state.startX, next.y - state.startY);
      if (!zoomed || moved < DRAG_THRESHOLD_PX) return;
      state.dragging = true;
      state.suppressClick = true;
      containerRef.current?.setPointerCapture?.(event.pointerId);
    }

    pan(
      (next.x - previous.x) / rect.width,
      (next.y - previous.y) / rect.height,
    );
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    const container = containerRef.current;
    if (container?.hasPointerCapture?.(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    const state = gesture.current;
    if (pointers.current.size < 2) state.pinchDistance = 0;
    if (pointers.current.size === 0) {
      state.dragging = false;
    } else if (pointers.current.size === 1) {
      // A finger left after a pinch: restart the drag from where it is now.
      const [remaining] = [...pointers.current.values()];
      state.startX = remaining.x;
      state.startY = remaining.y;
      state.dragging = false;
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!gesture.current.suppressClick) return;
    gesture.current.suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClickCapture={handleClickCapture}
      // Let the page scroll vertically until the map is zoomed in.
      style={{ touchAction: zoomed ? "none" : "pan-y" }}
      className={`relative mt-4 aspect-[1010/760] w-full overflow-hidden rounded-2xl border border-line/70 bg-map ${
        zoomed ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <svg
        viewBox={current ? formatViewBox(current) : viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby={labelledBy}
        className="h-full w-full select-none"
      >
        {children}
      </svg>

      {base ? (
        <div
          role="group"
          aria-label="Map zoom"
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute right-2 top-2 z-10 flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setView(null)}
            disabled={!zoomed}
            aria-label="Reset zoom"
            className={`${controlClass} text-xs`}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => zoom(1 / ZOOM_STEP)}
            disabled={!zoomed}
            aria-label="Zoom out"
            className={controlClass}
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            onClick={() => zoom(ZOOM_STEP)}
            disabled={scale >= MAX_SCALE - 0.001}
            aria-label="Zoom in"
            className={controlClass}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
