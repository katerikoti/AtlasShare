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
  context?: "personal" | "shared";
};

type Status = {
  tone: "idle" | "working" | "success" | "error";
  message?: string;
};

export function ExportMapPanel({
  visited,
  geometry,
  context = "personal",
}: ExportMapPanelProps) {
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<Status>({ tone: "idle" });
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const inputId = useId();
  const hintId = useId();
  const year = new Date().getFullYear();

  const input = useMemo(
    () => createExportMapInput({ visited, displayName, year }),
    [visited, displayName, year],
  );

  const busy = status.tone === "working";
  const ready = geometry !== null && !busy;

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
        shareTitle: `My ${brand.name} map`,
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
            {context === "shared"
              ? "Create a high-resolution image of your own map. Only your marks are included — never the group's combined view or another member's map."
              : "Create a high-resolution image of your map. On supported devices the share sheet opens; elsewhere the PNG downloads."}
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
              placeholder="My travels"
              className={`${inputClass} py-2.5`}
            />
            <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
              Leave blank to use “My travels”. The image also includes the year
              and your count.
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
            The image contains only your country marks, the title you choose,
            the year, and public map information. It never includes your email,
            account id, another member&apos;s visits, or shared-map data.
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
