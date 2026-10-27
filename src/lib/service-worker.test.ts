import { describe, expect, it } from "vitest";

import {
  CACHEABLE_PATHS,
  isCacheableAsset,
  isPrivatePath,
  renderServiceWorker,
} from "./service-worker";

describe("service worker cache policy", () => {
  it("denies private and authenticated paths", () => {
    expect(isPrivatePath("/api/auth/session")).toBe(true);
    expect(isPrivatePath("/invite/raw-token")).toBe(true);
    expect(isPrivatePath("/account")).toBe(true);
    expect(isPrivatePath("/shared/map-id")).toBe(true);
    expect(isPrivatePath("/map")).toBe(true);
    expect(isPrivatePath("/sign-in")).toBe(true);
    expect(isPrivatePath("/privacy")).toBe(false);
  });

  it("only allows explicit public static assets", () => {
    expect(isCacheableAsset("/_next/static/chunks/app.js")).toBe(true);
    expect(isCacheableAsset("/icons/icon-192.png")).toBe(true);
    expect(isCacheableAsset("/map/countries.json")).toBe(true);
    expect(isCacheableAsset("/manifest.webmanifest")).toBe(true);
    expect(isCacheableAsset("/icon.svg")).toBe(true);

    expect(isCacheableAsset("/api/auth/session")).toBe(false);
    expect(isCacheableAsset("/invite/raw-token")).toBe(false);
    expect(isCacheableAsset("/account")).toBe(false);
    expect(isCacheableAsset("/shared/map-id")).toBe(false);
    expect(isCacheableAsset("/map")).toBe(false);
    expect(isCacheableAsset("/")).toBe(false);
    expect(isCacheableAsset("/_next/image?url=%2Fprivate.png")).toBe(false);
  });

  it("never stores navigation responses", () => {
    const script = renderServiceWorker();
    const navigation = script.slice(
      script.indexOf("async function navigationResponse"),
      script.indexOf("async function assetResponse"),
    );

    expect(navigation).toContain("fetch(request)");
    expect(navigation).toContain("caches.match(OFFLINE_URL)");
    expect(navigation).not.toContain("cache.put");
    expect(navigation).not.toContain("caches.open");
  });

  it("generates the explicit denylist and update messages", () => {
    const script = renderServiceWorker();

    expect(script).toContain('request.method !== "GET"');
    expect(script).toContain('request.mode === "navigate"');
    expect(script).toContain(JSON.stringify(CACHEABLE_PATHS));
    expect(script).toContain('"/api"');
    expect(script).toContain('"/invite"');
    expect(script).toContain('"SKIP_WAITING"');
    expect(script).toContain('"CLEAR_RUNTIME_CACHES"');
    expect(script).not.toContain("importScripts");
    expect(script).not.toContain("${");
  });
});
