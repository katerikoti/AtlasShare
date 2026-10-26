import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mocks.redirect(url),
}));

vi.mock("./auth", () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));

beforeEach(() => {
  vi.resetModules();
  mocks.getSession.mockReset();
  mocks.redirect.mockReset();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`redirect:${url}`);
  });
});

describe("requireSession", () => {
  it("redirects to sign-in when there is no session", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { requireSession } = await import("./session");

    await expect(requireSession()).rejects.toThrow("redirect:/sign-in");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("returns the session when one exists", async () => {
    const session = {
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
    };
    mocks.getSession.mockResolvedValue(session);
    const { requireSession } = await import("./session");

    await expect(requireSession()).resolves.toBe(session);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
