import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { brand } from "../src/config/brand.ts";

/**
 * Regenerates the link-preview assets, `src/app/opengraph-image.png` and
 * `src/app/twitter-image.png`, from the real brand mark and the real map
 * geometry, so shared links (WhatsApp, iMessage, Slack, X) show the current
 * logo and an actual product visual instead of the old placeholder layout.
 *
 * Run after changing branding or the map look with `npm run data:og-image`.
 * Deterministic output; the files are committed like the rest of the data.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = brand.palette;
const W = 1200;
const H = 630;

const geometry = JSON.parse(
  readFileSync(resolve(root, "public/map/countries.json"), "utf8"),
);
const logo = readFileSync(
  resolve(root, "public/brand/atlas-share-mark-transparent.png"),
);

const escapeXml = (text) =>
  text.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });

/**
 * Countries to show as visited in the preview. Morocco and Palestine are the
 * intentional campaign references (D3 geometry); the rest fill the frame
 * loosely. Keep the list small and plausible.
 */
const SAMPLE_VISITED = new Set(["MA", "PS", "PT", "HR", "KE", "JP", "BR", "CA"]);

// Crop around the Mediterranean/North Africa so Morocco + Western Sahara and
// the Levant (the merged territories) are clearly visible at 1200×630 size.
const mapViewBox = { x: 372, y: 228, width: 318, height: 272 };
const mapX = 708;
const mapY = 152;
const mapW = 404;
const mapH = 348;

const countryPaths = Object.entries(geometry.paths)
  .map(([code, d]) => {
    const visited = SAMPLE_VISITED.has(code);
    return `<path d="${d}" fill="${visited ? p.rose : p.map}" stroke="${
      visited ? p.roseDeep : p.moss
    }" stroke-width="0.55" stroke-linejoin="round"/>`;
  })
  .join("");

const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${p.canvas}"/>
  <rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="36" fill="${
    p.surface
  }" stroke="${p.line}" stroke-width="1.5"/>

  <image href="${logoDataUri}" x="56" y="44" width="58" height="58"/>
  <text x="128" y="76" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="27" font-weight="700" letter-spacing="-0.5" fill="${p.ink}">${brand.name}</text>
  <text x="128" y="100" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="12.5" font-weight="700" letter-spacing="2.6" fill="${p.moss}">A SHARED TRAVEL ATLAS</text>

  <text x="56" y="238" font-family="Georgia, Times New Roman, serif" font-size="72" letter-spacing="-2.5" fill="${p.ink}">Your world,</text>
  <text x="56" y="318" font-family="Georgia, Times New Roman, serif" font-size="72" letter-spacing="-2.5" font-style="italic" fill="${p.moss}">mapped together.</text>

  <rect x="56" y="352" width="560" height="3" rx="1.5" fill="${p.rose}"/>
  <text x="56" y="398" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="21" fill="${p.inkMuted}">
    <tspan x="56" dy="0">${escapeXml(
      "Track the countries you have visited on your own world map,",
    )}</tspan>
    <tspan x="56" dy="30">${escapeXml(
      "then create shared maps with your family and friends.",
    )}</tspan>
    <tspan x="56" dy="30">${escapeXml(
      "Private by default. No analytics, no location tracking.",
    )}</tspan>
  </text>

  <rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" rx="24" fill="${
    p.map
  }" stroke="${p.line}" stroke-width="1"/>
  <clipPath id="mapClip"><rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" rx="24"/></clipPath>
  <g clip-path="url(#mapClip)">
    <g transform="translate(${mapX}, ${mapY}) scale(${Math.min(
    mapW / mapViewBox.width,
    mapH / mapViewBox.height,
  )}) translate(${-mapViewBox.x}, ${-mapViewBox.y})">
      ${countryPaths}
    </g>
  </g>

  <text x="56" y="556" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="17" font-weight="600" fill="${p.moss}">195 countries · Private by default</text>
  <text x="56" y="582" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="17" fill="${p.moss}">atlasshare.eu</text>
  <text x="${W - 56}" y="556" text-anchor="end" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="17" fill="${p.moss}">No analytics or location tracking</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();

const dir = resolve(root, "src/app");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "opengraph-image.png"), png);
writeFileSync(resolve(dir, "twitter-image.png"), png);
writeFileSync(
  resolve(dir, "opengraph-image.alt.txt"),
  `${brand.name} — ${brand.tagline}\n`,
);
writeFileSync(
  resolve(dir, "twitter-image.alt.txt"),
  `${brand.name} — ${brand.tagline}\n`,
);

console.log(
  `OG image written (1200x630, ${png.length.toLocaleString("en")} bytes).`,
);
