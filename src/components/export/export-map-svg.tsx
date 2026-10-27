import type { Ref } from "react";

import { countriesAlphabetical } from "@/data/countries";
import { brand } from "@/config/brand";
import type { MapGeometry } from "@/components/map/use-map-geometry";
import {
  exportMapHeight,
  exportMapWidth,
  type ExportMapInput,
} from "@/lib/export-map";

type ExportMapSvgProps = {
  geometry: MapGeometry;
  input: ExportMapInput;
  className?: string;
  svgRef?: Ref<SVGSVGElement>;
};

const displayFont =
  "ui-serif, Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const sansFont =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const card = { x: 40, y: 40, width: 1520, height: 920, radius: 48 };
const mapPanel = { x: 450, y: 96, width: 1090, height: 832, radius: 32 };
const mapBox = { x: 470, y: 110, width: 1050, height: 804 };

/**
 * The pure visual source of an exported map.
 *
 * Every color, font, shape, and text run is inline. The page may add a
 * presentation class to the preview, but the drawing has no external assets or
 * stylesheet dependencies, so serializing it and drawing it into a canvas
 * cannot taint the canvas.
 */
export function ExportMapSvg({
  geometry,
  input,
  className,
  svgRef,
}: ExportMapSvgProps) {
  const visited = new Set(input.visited);
  const count = Math.max(0, Math.min(input.count, countriesAlphabetical.length));
  const percent = Math.round((count / countriesAlphabetical.length) * 1000) / 10;
  const title = input.displayName ?? "My travels";
  const titleLines = wrapText(title, 15, 3);
  const mapTransform = fitMap(geometry.viewBox, mapBox);

  const titleStart = 190;
  const titleLineHeight = 46;
  const titleEnd = titleStart + (titleLines.length - 1) * titleLineHeight;
  const countLabelY = titleEnd + 64;
  const countY = countLabelY + 108;
  const metaY = countY + 40;
  const metaSecondY = metaY + 29;
  const progressY = metaSecondY + 34;
  const progressWidth = 316;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${exportMapWidth} ${exportMapHeight}`}
      width={exportMapWidth}
      height={exportMapHeight}
      role="img"
      aria-label={`Exported map: ${count} of ${countriesAlphabetical.length} countries visited.`}
      className={className}
      data-export-map=""
    >
      <rect
        width={exportMapWidth}
        height={exportMapHeight}
        fill={brand.palette.canvas}
      />
      <rect
        x={card.x}
        y={card.y}
        width={card.width}
        height={card.height}
        rx={card.radius}
        fill={brand.palette.surface}
      />

      <g>
        <circle
          cx={115}
          cy={102}
          r={12}
          fill={brand.palette.rose}
          stroke={brand.palette.moss}
          strokeWidth={2}
        />
        <path
          d="M109 102h12M115 96v12"
          stroke={brand.palette.moss}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <text
          x={140}
          y={110}
          fill={brand.palette.moss}
          fontFamily={sansFont}
          fontSize={16}
          fontWeight={700}
          letterSpacing={4}
        >
          {brand.name.toUpperCase()}
        </text>
      </g>

      <g fill={brand.palette.ink} fontFamily={displayFont}>
        {titleLines.map((line, index) => (
          <text
            key={`${line}-${index}`}
            x={104}
            y={titleStart + index * titleLineHeight}
            fontSize={42}
            fontWeight={500}
            letterSpacing={-1}
          >
            {line}
          </text>
        ))}
      </g>

      <text
        x={104}
        y={countLabelY}
        fill={brand.palette.moss}
        fontFamily={sansFont}
        fontSize={15}
        fontWeight={700}
        letterSpacing={3}
      >
        COUNTRIES VISITED
      </text>
      <text
        x={104}
        y={countY}
        fill={brand.palette.ink}
        fontFamily={displayFont}
        fontSize={112}
        fontWeight={500}
        letterSpacing={-4}
      >
        {count}
      </text>
      <text
        x={104}
        y={metaY}
        fill={brand.palette.inkMuted}
        fontFamily={sansFont}
        fontSize={21}
      >
        of {countriesAlphabetical.length} countries
      </text>
      <text
        x={104}
        y={metaSecondY}
        fill={brand.palette.inkMuted}
        fontFamily={sansFont}
        fontSize={21}
      >
        {percent.toFixed(1)}% of the world
      </text>

      <rect
        x={104}
        y={progressY}
        width={progressWidth}
        height={10}
        rx={5}
        fill={brand.palette.line}
        opacity={0.65}
      />
      <rect
        x={104}
        y={progressY}
        width={(progressWidth * count) / countriesAlphabetical.length}
        height={10}
        rx={5}
        fill={brand.palette.roseDeep}
      />

      <text
        x={104}
        y={progressY + 76}
        fill={brand.palette.inkMuted}
        fontFamily={sansFont}
        fontSize={19}
        fontStyle="italic"
      >
        {brand.tagline}
      </text>

      <text
        x={104}
        y={905}
        fill={brand.palette.moss}
        fontFamily={sansFont}
        fontSize={16}
        fontWeight={500}
      >
        Made with {brand.name} · {input.year}
      </text>

      <rect
        x={mapPanel.x}
        y={mapPanel.y}
        width={mapPanel.width}
        height={mapPanel.height}
        rx={mapPanel.radius}
        fill={brand.palette.map}
        stroke={brand.palette.line}
        strokeWidth={1}
      />
      <g transform={mapTransform}>
        {countriesAlphabetical.map((country) => (
          <path
            key={country.code}
            d={geometry.paths[country.code]}
            data-country={country.code}
            data-visited={visited.has(country.code)}
            fill={
              visited.has(country.code)
                ? brand.palette.rose
                : brand.palette.map
            }
            stroke={brand.palette.moss}
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}

function fitMap(viewBox: string, box: typeof mapBox): string {
  const [x, y, width, height] = viewBox
    .trim()
    .split(/\s+/)
    .map((value) => Number.parseFloat(value));

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return "";
  }

  const scale = Math.min(box.width / width, box.height / height);
  const translateX = box.x + (box.width - width * scale) / 2 - x * scale;
  const translateY = box.y + (box.height - height * scale) / 2 - y * scale;

  return `translate(${translateX} ${translateY}) scale(${scale})`;
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.split(/\s+/).flatMap((word) => hardWrap(word, maxChars));
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);
  return lines.length > 0 ? lines.slice(0, maxLines) : ["My travels"];
}

function hardWrap(value: string, maxChars: number): string[] {
  if (value.length <= maxChars) return [value];

  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += maxChars) {
    chunks.push(value.slice(index, index + maxChars));
  }
  return chunks;
}
