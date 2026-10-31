import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { setPrecision, union } from "polyclip-ts";

/**
 * Generates the canonical country metadata and SVG geometry.
 *
 * Source: @svg-maps/world 2.0.0 (CC BY 4.0). The source map contains 256
 * locations, including territories, Kosovo, and non-ISO extras. This project
 * deliberately shows the 195 recognized countries: the 193 UN member states
 * plus the two non-member observer states, the Holy See and Palestine. Every
 * other location is filtered out.
 *
 * The output is deterministic. Run with `npm run data:countries`.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = resolve(root, "node_modules/@svg-maps/world");
const sourcePath = resolve(packagePath, "index.js");
const pkg = JSON.parse(readFileSync(resolve(packagePath, "package.json"), "utf8"));

if (pkg.version !== "2.0.0") {
  throw new Error(
    `Expected @svg-maps/world 2.0.0, found ${pkg.version}. Update this script deliberately.`,
  );
}

// The 193 UN member states plus the Holy See (VA) and Palestine (PS).
const recognizedCountries = new Set(
  `
  AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ
  CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ
  FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP
  KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML
  MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW
  PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL
  TM TN TO TR TT TV TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW
  `
    .trim()
    .split(/\s+/),
);

if (recognizedCountries.size !== 195) {
  throw new Error(
    `Expected 195 recognized countries, found ${recognizedCountries.size}.`,
  );
}

// Display names that we want to be unambiguous in the UI. Keep this list small
// and review every change; the dataset is also used for search and tests.
const nameOverrides = {
  bn: "Brunei",
  cd: "Democratic Republic of the Congo",
  cg: "Republic of the Congo",
  cv: "Cabo Verde",
  cz: "Czechia",
  fm: "Micronesia",
  la: "Laos",
  mk: "North Macedonia",
  ps: "Palestine",
  st: "São Tomé and Príncipe",
  sz: "Eswatini",
  tr: "Türkiye",
  us: "United States",
  va: "Holy See (Vatican City)",
  vc: "Saint Vincent and the Grenadines",
};

const sourceText = readFileSync(sourcePath, "utf8");
const map = JSON.parse(sourceText.replace(/^export default /, "").trim());
const byCode = new Map();

/**
 * Makes a source path safe to append to another path as a second subpath.
 *
 * Two non-obvious SVG rules make naive merging fail:
 *
 * 1. Every source path starts with a RELATIVE moveto ("m dx,dy"). Appending it
 *    verbatim is measured from wherever the previous subpath left the pen, so
 *    the shape lands far away from its real position.
 * 2. After an ABSOLUTE moveto ("M x,y"), the pairs that follow are implicit
 *    ABSOLUTE linetos, while after a relative "m" they stay relative. Simply
 *    upper-casing the leading "m" therefore draws straight lines from (0,0).
 *
 * The correct merge keeps the moveto absolute but makes the continuation
 * explicitly relative: "m dx,dy <pairs>" becomes "M dx,dy l <pairs>".
 */
function toAppendablePath(path) {
  const head = path.match(/^m\s*(-?[\d.]+(?:e-?\d+)?)[\s,]\s*(-?[\d.]+(?:e-?\d+)?)/i);
  if (!head) {
    throw new Error(`Expected a relative leading moveto, got: ${path.slice(0, 20)}`);
  }
  const rest = path.slice(head[0].length).trim();
  return rest.length > 0
    ? `M ${head[1]},${head[2]} l ${rest}`
    : `M ${head[1]},${head[2]}`;
}

function mergePaths(...paths) {
  return paths.join(" ");
}

/**
 * Interprets an svg-maps path into absolute-coordinate rings.
 *
 * Grammar in these sources: [m|M] x y <more x y pairs>... z, where after a
 * relative "m" every following pair is a RELATIVE lineto and after an absolute
 * "M" an ABSOLUTE one, and "z" closes the subpath back to its start.
 */
function toRings(path) {
  const tokens = path.match(/-?\d*\.?\d+(?:e-?\d+)?|[mMzZ]/g) ?? [];
  const rings = [];
  let mode = null;
  let pen = [0, 0];
  let ring = null;
  let ringStart = null;
  let index = 0;
  const number = () => {
    const value = parseFloat(tokens[index++]);
    if (Number.isNaN(value)) throw new Error(`Bad path coordinate in: ${path.slice(0, 30)}`);
    return value;
  };
  while (index < tokens.length) {
    const token = tokens[index++];
    if (token === "m" || token === "M") {
      if (ring && ring.length) rings.push(ring);
      mode = token;
      ring = [];
      const dx = number();
      const dy = number();
      if (mode === "m") pen = [pen[0] + dx, pen[1] + dy];
      else pen = [dx, dy];
      ringStart = pen.slice();
      ring.push(pen.slice());
      continue;
    }
    if (token === "z" || token === "Z") {
      if (ring && ring.length) {
        ring.push(ringStart.slice());
        rings.push(ring);
      }
      ring = null;
      mode = null;
      continue;
    }
    index--; // the pair starts with this token
    const dx = number();
    const dy = number();
    if (mode === "m") pen = [pen[0] + dx, pen[1] + dy];
    else pen = [dx, dy];
    ring.push(pen.slice());
  }
  if (ring && ring.length) rings.push(ring);
  return rings;
}

function formatCoordinate(value) {
  const rounded = Number(value.toFixed(5));
  const text = String(rounded);
  return text === "-0" ? "0" : text;
}

/**
 * Builds a path string from a ring using the established safe pattern:
 * absolute moveto head plus explicitly relative lineto pairs, closed with "z".
 */
function ringToPath(ring) {
  const points = ring.slice();
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) points.pop();
  }
  if (points.length < 4) {
    throw new Error(`Degenerate ring with ${points.length} points`);
  }
  // The union ring's endpoints can drift apart by a hair. Make the final
  // lineto land exactly on the start point so "z" closes without a kink.
  const pointsWithClosure = [...points, [points[0][0], points[0][1]]];
  const parts = [
    `M ${formatCoordinate(pointsWithClosure[0][0])},${formatCoordinate(pointsWithClosure[0][1])}`,
  ];
  const linetos = [];
  for (let i = 1; i < pointsWithClosure.length; i++) {
    const dx = formatCoordinate(pointsWithClosure[i][0] - pointsWithClosure[i - 1][0]);
    const dy = formatCoordinate(pointsWithClosure[i][1] - pointsWithClosure[i - 1][1]);
    linetos.push(`${dx},${dy}`);
  }
  parts.push(`l ${linetos.join(" ")}`, "z");
  return parts.join(" ");
}

for (const location of map.locations) {
  const id = String(location.id).toLowerCase();
  if (!recognizedCountries.has(id.toUpperCase())) continue;

  const code = id.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new Error(`Invalid source id: ${location.id}`);
  }
  if (byCode.has(code)) {
    throw new Error(`Duplicate source code: ${code}`);
  }
  byCode.set(code, {
    code,
    name: nameOverrides[id] ?? location.name,
    path: location.path,
  });
}

/**
 * Documented geometric modifications (user-approved geopolitics):
 *
 * - Morocco is drawn with Western Sahara (source code `eh`): one path with two
 *   subpaths, so marking Morocco highlights the full territory and both
 *   coastlines' borders stay visible.
 * - Palestine is drawn as the union of Israel and the Palestinian territories:
 *   a single outline with no internal West Bank or Gaza borders. Clicking it
 *   highlights the whole area as Palestine.
 * - Israel keeps its own source path in the dataset but is NOT drawn on the
 *   map (`mapHiddenCountryCodes` in src/data/countries.ts). It can still be
 *   marked in the country list; the marking affects only counts, never the
 *   map or the exported image. Marking is not linked between the two.
 */
const rawPath = (id) => {
  const location = map.locations.find((entry) => entry.id === id);
  if (!location) throw new Error(`Missing source location: ${id}`);
  return location.path;
};

byCode.get("MA").path = mergePaths(
  byCode.get("MA").path,
  toAppendablePath(rawPath("eh")),
);

const palestineRings = toRings(rawPath("ps"));
const israelRings = toRings(rawPath("il"));
if (palestineRings.length !== 2 || israelRings.length !== 1) {
  throw new Error(
    `Unexpected source shape: Israel has ${israelRings.length} ring(s), Palestine has ${palestineRings.length}`,
  );
}

// The source datasets encode the shared border with slightly different vertex
// sets (same line, ±0.003 units). The epsilon collapses those sliver cracks;
// the result must be exactly one outer ring with no holes.
setPrecision(0.001);
const palestineUnion = union(
  israelRings,
  [palestineRings[0]],
  [palestineRings[1]],
);
if (palestineUnion.length !== 1 || palestineUnion[0].length !== 1) {
  throw new Error(
    `Israel/Palestine union must be a single hole-free ring, got ${palestineUnion.length} polygon(s), ${palestineUnion[0]?.length ?? 0} ring(s)`,
  );
}
byCode.get("PS").path = ringToPath(palestineUnion[0][0]);
byCode.get("IL").path = rawPath("il");

const countries = [...byCode.values()].sort((a, b) =>
  a.code.localeCompare(b.code),
);

if (countries.length !== 195) {
  throw new Error(`Expected 195 countries, generated ${countries.length}`);
}
for (const required of ["IL", "PS", "VA"]) {
  if (!byCode.has(required)) {
    throw new Error(`Missing required country: ${required}`);
  }
}
if (byCode.get("PS").path === byCode.get("IL").path) {
  throw new Error("Palestine must be the union outline, not Israel's path");
}
const palestineSubpaths = byCode.get("PS").path.split(/(?=M)/g);
if (palestineSubpaths.length !== 1) {
  throw new Error(`Palestine must be a single hole-free outline, got ${palestineSubpaths.length}`);
}
if (!palestineSubpaths[0].includes(" l ")) {
  throw new Error("Palestine ring must use the explicit relative lineto pattern");
}
if (!byCode.get("MA").path.includes(toAppendablePath(rawPath("eh")))) {
  throw new Error("Morocco must include Western Sahara");
}
// Regression guard for the SVG implicit-lineto bug: every appended subpath
// must pair an absolute moveto with an explicitly relative lineto head, or it
// silently draws lines from (0,0) across the map.
const appendsCorrectly = (path) =>
  /^M -?[\d.]+(e-?\d+)?,-?[\d.]+(e-?\d+)? l /.test(path);
if (!appendsCorrectly(toAppendablePath(rawPath("eh")))) {
  throw new Error("Appended subpaths must pair an absolute moveto with explicit relative linetos");
}

const generatedSource = `// Generated by scripts/generate-countries.mjs. Do not edit by hand.\n// Source: @svg-maps/world 2.0.0 (CC BY 4.0) with the documented modifications.\n// See public/map/NOTICE.txt for attribution and licences.\n\nexport const countries = [\n${countries
  .map(
    (country) =>
      `  { code: ${JSON.stringify(country.code)}, name: ${JSON.stringify(
        country.name,
      )} },`,
  )
  .join("\n")}\n] as const;\n`;

const geometry = {
  viewBox: "0 0 1010 760",
  paths: Object.fromEntries(
    countries.map((country) => [country.code, country.path]),
  ),
};

mkdirSync(resolve(root, "src/data"), { recursive: true });
mkdirSync(resolve(root, "public/map"), { recursive: true });

writeFileSync(
  resolve(root, "src/data/countries.generated.ts"),
  generatedSource,
);
writeFileSync(
  resolve(root, "public/map/countries.json"),
  `${JSON.stringify(geometry, null, 2)}\n`,
);

console.log(`Generated ${countries.length} countries and ${countries.length} paths.`);
