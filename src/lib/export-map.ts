import { countries, isCountryCode, type CountryCode } from "@/data/countries";

/**
 * The complete, explicit input for an exported map image.
 *
 * Keep this type deliberately small. It must not be possible to pass a shared
 * map, another member's visits, an email address, or an account id into the
 * export renderer without adding a new field here first.
 */
export type ExportMapInput = {
  visited: readonly CountryCode[];
  count: number;
  displayName?: string;
  year: number;
};

export const exportMapWidth = 1600;
export const exportMapHeight = 1000;

export const maxExportDisplayNameLength = 40;

/**
 * Build export input from an untrusted visit set.
 *
 * Unknown and retired country codes are dropped, duplicates are removed, and
 * the countries are ordered by the canonical dataset. The count is always
 * derived from the cleaned set so the image cannot show a stale total.
 */
export function createExportMapInput({
  visited,
  displayName,
  year = new Date().getFullYear(),
}: {
  visited: Iterable<string>;
  displayName?: string;
  year?: number;
}): ExportMapInput {
  const requested = new Set<string>();
  for (const code of visited) {
    if (isCountryCode(code)) requested.add(code);
  }

  const orderedVisited = countries
    .filter((country) => requested.has(country.code))
    .map((country) => country.code);

  const cleanedName = (displayName ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxExportDisplayNameLength);

  return {
    visited: orderedVisited,
    count: orderedVisited.length,
    displayName: cleanedName || undefined,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100
        ? year
        : new Date().getFullYear(),
  };
}

export type ExportOutcome =
  | "shared"
  | "downloaded"
  | "cancelled"
  | "svg-downloaded";

/**
 * Draw the serialized SVG to a 2× canvas and deliver a PNG through the share
 * sheet when available, otherwise through a download. If canvas rendering
 * fails, download the SVG instead.
 */
export async function exportMapImage({
  svg,
  fileName,
  shareTitle,
  width = exportMapWidth,
  height = exportMapHeight,
  pixelRatio = 2,
}: {
  svg: string;
  fileName: string;
  shareTitle: string;
  width?: number;
  height?: number;
  pixelRatio?: number;
}): Promise<ExportOutcome> {
  let png: Blob | null = null;

  try {
    png = await rasterizeSvg(svg, width, height, pixelRatio);
  } catch {
    downloadBlob(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      `${fileName}.svg`,
    );
    return "svg-downloaded";
  }

  let file: File | null = null;
  try {
    file = new File([png], `${fileName}.png`, { type: "image/png" });
  } catch {
    // Older browsers may not support constructing a File. They still download.
  }

  if (file && canShareFile(file)) {
    try {
      await navigator.share?.({ files: [file], title: shareTitle });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Some browsers claim file-share support and then reject the request.
      // Falling back to a download keeps the action useful.
    }
  }

  downloadBlob(png, `${fileName}.png`);
  return "downloaded";
}

async function rasterizeSvg(
  svg: string,
  width: number,
  height: number,
  pixelRatio: number,
): Promise<Blob> {
  const svgUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function canShareFile(file: File): boolean {
  if (
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The SVG could not be loaded."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not create a PNG."));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
