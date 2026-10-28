/**
 * Pure view-box math for the zoomable world maps. The map is zoomed by
 * shrinking the SVG `viewBox` inside the full geometry box, so strokes and
 * hit targets need no other handling.
 */
export type ViewRect = { x: number; y: number; w: number; h: number };

export const MIN_SCALE = 1;
export const MAX_SCALE = 8;
export const ZOOM_STEP = 1.6;

export function parseViewBox(viewBox: string): ViewRect | null {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

export function formatViewBox(view: ViewRect): string {
  return [view.x, view.y, view.w, view.h]
    .map((value) => Number(value.toFixed(3)))
    .join(" ");
}

export function scaleOf(base: ViewRect, view: ViewRect): number {
  return base.w / view.w;
}

/** Keep a view inside the base geometry box and inside the zoom limits. */
export function clampView(base: ViewRect, view: ViewRect): ViewRect {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, base.w / view.w));
  const w = base.w / scale;
  const h = base.h / scale;
  const x = Math.min(base.x + base.w - w, Math.max(base.x, view.x));
  const y = Math.min(base.y + base.h - h, Math.max(base.y, view.y));
  return { x, y, w, h };
}

/**
 * Zoom by `factor` keeping the point at (fx, fy) — fractions of the rendered
 * map, 0 to 1 — fixed on screen.
 */
export function zoomAt(
  base: ViewRect,
  view: ViewRect,
  factor: number,
  fx = 0.5,
  fy = 0.5,
): ViewRect {
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, scaleOf(base, view) * factor),
  );
  const w = base.w / scale;
  const h = base.h / scale;
  return clampView(base, {
    x: view.x + fx * view.w - fx * w,
    y: view.y + fy * view.h - fy * h,
    w,
    h,
  });
}

/**
 * Pan so the content follows a drag of (dxFrac, dyFrac), given as fractions of
 * the rendered map's width and height.
 */
export function panBy(
  base: ViewRect,
  view: ViewRect,
  dxFrac: number,
  dyFrac: number,
): ViewRect {
  return clampView(base, {
    ...view,
    x: view.x - dxFrac * view.w,
    y: view.y - dyFrac * view.h,
  });
}
