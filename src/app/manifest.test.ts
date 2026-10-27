import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("describes an installable standalone app with a public entry point", () => {
    const value = manifest();

    expect(value.name).toBe(brand.name);
    expect(value.short_name).toBe(brand.shortName);
    expect(value.start_url).toBe("/");
    expect(value.scope).toBe("/");
    expect(value.display).toBe("standalone");
    expect(value.background_color).toBe(brand.palette.canvas);
    expect(value.theme_color).toBe(brand.palette.canvas);
  });

  it("includes any and maskable install icons", () => {
    const value = manifest();
    const icons = value.icons ?? [];

    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
    expect(
      icons.every(
        (icon) =>
          typeof icon.src === "string" &&
          icon.src.startsWith("/icons/") &&
          icon.type === "image/png",
      ),
    ).toBe(true);
  });
});
