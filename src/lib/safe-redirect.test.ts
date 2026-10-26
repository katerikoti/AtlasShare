import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("accepts internal paths and preserves query and hash", () => {
    expect(safeNextPath("/shared/abc?joined=1")).toBe("/shared/abc?joined=1");
    expect(safeNextPath("/invite/token_123")).toBe("/invite/token_123");
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/shared#top")).toBe("/shared#top");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example/path")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("shared")).toBeNull();
  });

  it("rejects empty, whitespace, and control-character values", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(" /shared")).toBeNull();
    expect(safeNextPath("/shared\nlocation: https://evil.example")).toBeNull();
  });
});
