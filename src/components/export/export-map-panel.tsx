"use client";

import { useId, useMemo, useRef, useState } from "react";

import { brand } from "@/config/brand";
import type { MapGeometry } from "@/components/map/use-map-geometry";
import { ExportMapSvg } from "@/components/export/export-map-svg";
import { inputClass, primaryButtonClass } from "@/components/ui/form";
import {
  createExportMapInput,
  exportMapImage,
  maxExportDisplayNameLength,
} from "@/lib/export-map";

type ExportMapPanelProps = {
  visited: Iterable<string>;
  geometry: MapGeometry | null;
  context?: "personal" | "shared" | "shared-member";
  defaultTitle?: string;
};

type Status = {
  tone: "idle" | "working" | "success" | "error";
  message?: string;
};

export function ExportMapPanel({
  visited,
  geometry,
  context = "personal",
  defaultTitle = "My travels",
}: ExportMapPanelProps) {
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<Status>({ tone: "idle" });
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const inputId = useId();
  const hintId = useId();
  const year = new Date().getFullYear();
  const fallbackTitle = defaultTitle.trim() || "My travels";

  const input = useMemo(
    () =>
      createExportMapInput({
        visited,
        displayName: displayName.trim() ? displayName : fallbackTitle,
        year,
      }),
    [visited, displayName, fallbackTitle, year],
  );

  const busy = status.tone === "working";
  const ready = geometry !== null && !busy;
  const copy =
    context === "personal"
      ? {
          intro:
            "Create a high-resolution image of your map. On supported devices the share sheet opens; elsewhere the PNG downloads.",
          privacy:
            "The image is built from your country marks, the title you choose, the year, and the count. It never includes your email or account id.",
        }
      : context === "shared"
        ? {
            intro:
              "Create a high-resolution image of the combined shared map. All members' marks are included, but member names are not.",
            privacy:
              "The image is built from the combined country marks of this shared map, the title you choose, the year, and the count. It never includes member names, emails, account ids, notes, or visit dates.",
          }
        : {
            intro:
              "Create a high-resolution image of the selected member's map. The image does not include their name.",
            privacy:
              "The image is built from the selected member's country marks, the title you choose, the year, and the count. It never includes member names, emails, account ids, notes, or visit dates.",
          };

  async function handleExport() {
    if (!geometry || !svgRef.current) return;

    setStatus({ tone: "working", message: "Preparing your image…" });

    try {
      const svg = new XMLSerializer().serializeToString(svgRef.current);
      const fileStem = brand.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const outcome = await exportMapImage({
        svg,
        fileName: `${fileStem}-map-${input.year}-${input.count}`,
        shareTitle:
          context === "personal"
            ? `My ${brand.name} map`
            : `Shared ${brand.name} map`,
      });

      if (outcome === "shared") {
        setStatus({ tone: "success", message: "Image shared." });
      } else if (outcome === "downloaded") {
        setStatus({ tone: "success", message: "PNG downloaded." });
      } else if (outcome === "svg-downloaded") {
        setStatus({
          tone: "success",
          message:
            "The PNG could not be created, so the SVG image was downloaded instead.",
        });
      } else {
        setStatus({ tone: "idle", message: "Sharing cancelled." });
      }
    } catch {
      setStatus({
        tone: "error",
        message: "The image could not be prepared. Please try again.",
      });
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-card border border-line/80 bg-surface/80 p-5 shadow-soft sm:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        <div>
          <h2 id={titleId} className="font-display text-2xl tracking-tight">
            Share your map
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {copy.intro}
          </p>

          <div className="mt-5 max-w-md">
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-ink"
            >
              Image title <span className="text-ink-muted">(optional)</span>
            </label>
            <input
              id={inputId}
              type="text"
              value={displayName}
              maxLength={maxExportDisplayNameLength}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setStatus({ tone: "idle" });
              }}
              aria-describedby={hintId}
              placeholder={fallbackTitle}
              className={`${inputClass} py-2.5`}
            />
            <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
              Leave blank to use “{fallbackTitle}”. The image also includes the
              year and the country count.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={!ready}
            className={`${primaryButtonClass} mt-5 sm:w-auto`}
          >
            {busy ? "Preparing image…" : "Share or download image"}
          </button>

          {status.message ? (
            <p
              role={status.tone === "error" ? "alert" : "status"}
              className={`mt-3 text-sm ${
                status.tone === "error" ? "text-rose-deep" : "text-moss"
              }`}
            >
              {status.message}
            </p>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            {copy.privacy}
          </p>
        </div>

        <figure className="min-w-0">
          <figcaption className="sr-only">Export preview</figcaption>
          {geometry ? (
            <ExportMapSvg
              geometry={geometry}
              input={input}
              svgRef={svgRef}
              className="h-auto w-full rounded-2xl border border-line/70 shadow-soft"
            />
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[8/5] animate-pulse rounded-2xl border border-line/70 bg-canvas/60"
            />
          )}
        </figure>
      </div>
    </section>
  );
}
