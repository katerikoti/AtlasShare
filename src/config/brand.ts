/**
 * Single source of truth for AtlasShare product identity.
 *
 * Change the product name here and in the places listed in
 * docs/ARCHITECTURE.md ("Product identity"). Do not hard-code "AtlasShare"
 * across the codebase.
 *
 * The palette below mirrors the CSS design tokens in src/app/globals.css.
 * CSS is the source of truth for styling; these values exist for non-CSS
 * contexts such as the image export and transactional emails.
 */
export const brand = {
  name: "AtlasShare",
  shortName: "AtlasShare",
  tagline: "Your world, mapped together.",
  description:
    "Track the countries you have visited on your own world map, then create shared maps with your family and friends.",
  palette: {
    canvas: "#E9E3DD",
    surface: "#F4EFEA",
    ink: "#2B302C",
    inkMuted: "#5A6159",
    moss: "#5A6655",
    rose: "#DCA1A1",
    roseDeep: "#C98585",
    line: "#C9C1B9",
    map: "#F1ECE6",
  },
  repositoryUrl: "https://github.com/katerikoti/AtlasShare",
  portfolioUrl: "https://katerinamaenpaa.dev",
} as const;

export type Brand = typeof brand;
