import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";
import { renderOfflinePage } from "./offline-page";

describe("offline page", () => {
  it("is a self-contained branded document", () => {
    const html = renderOfflinePage();

    expect(html).toContain("<!doctype html>");
    expect(html).toContain(brand.name);
    expect(html).toContain("You’re offline.");
    expect(html).toContain('href="/"');
    expect(html).toContain("No private map data is stored in the offline cache.");
    expect(html).toContain('name="robots" content="noindex, nofollow"');
  });

  it("has no scripts, remote assets, or private data", () => {
    const html = renderOfflinePage();

    expect(html).not.toContain("<script");
    expect(html).not.toContain("http://");
    expect(html).not.toContain("https://");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("accountId");
    expect(html).not.toContain("visited");
  });
});
