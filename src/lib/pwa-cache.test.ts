import { afterEach, describe, expect, it, vi } from "vitest";

import { clearPrivateRuntimeCaches } from "./pwa-cache";
import { SW_RUNTIME_CACHE_PREFIX } from "./service-worker";

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: undefined,
  });
});

describe("clearPrivateRuntimeCaches", () => {
  it("removes only runtime caches and messages the worker", async () => {
    const keys = [
      `${SW_RUNTIME_CACHE_PREFIX}one`,
      `${SW_RUNTIME_CACHE_PREFIX}two`,
      "atlas-pwa-shell-one",
      "unrelated-cache",
    ];
    const deleted: string[] = [];
    const postMessage = vi.fn();

    vi.stubGlobal("caches", {
      keys: vi.fn(async () => keys),
      delete: vi.fn(async (key: string) => {
        deleted.push(key);
        return true;
      }),
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage } },
    });

    await expect(clearPrivateRuntimeCaches()).resolves.toEqual({ cleared: 2 });
    expect(deleted).toEqual([
      `${SW_RUNTIME_CACHE_PREFIX}one`,
      `${SW_RUNTIME_CACHE_PREFIX}two`,
    ]);
    expect(postMessage).toHaveBeenCalledWith({ type: "CLEAR_RUNTIME_CACHES" });
  });

  it("does not throw when cache storage is unavailable", async () => {
    await expect(clearPrivateRuntimeCaches()).resolves.toEqual({ cleared: 0 });
  });
});
