import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  setVisitedCountryForUser: vi.fn(),
}));

vi.mock("@/server/session", () => ({
  requireSession: async () => {
    const session = await mocks.getSession();
    if (!session) throw new Error("redirect:/sign-in");
    return session;
  },
}));

vi.mock("@/server/visits", () => ({
  setVisitedCountryForUser: mocks.setVisitedCountryForUser,
}));

const signedIn = {
  user: { id: "user_1", name: "Ada", email: "ada@example.com" },
};

beforeEach(() => {
  vi.resetModules();
  mocks.getSession.mockReset();
  mocks.setVisitedCountryForUser.mockReset();
  mocks.setVisitedCountryForUser.mockResolvedValue(undefined);
});

describe("setVisitedCountryAction authorization and validation", () => {
  it("rejects unauthenticated calls before writing", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { setVisitedCountryAction } = await import("./visits");

    await expect(setVisitedCountryAction("SE", true)).rejects.toThrow(
      "redirect:/sign-in",
    );
    expect(mocks.setVisitedCountryForUser).not.toHaveBeenCalled();
  });

  it("rejects codes outside the committed dataset", async () => {
    mocks.getSession.mockResolvedValue(signedIn);
    const { setVisitedCountryAction } = await import("./visits");

    for (const code of ["XX", "se", "", "<script>"]) {
      await expect(setVisitedCountryAction(code, true)).resolves.toEqual({
        ok: false,
        message: "That country is not in the map dataset.",
      });
    }
    expect(mocks.setVisitedCountryForUser).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean desired state", async () => {
    mocks.getSession.mockResolvedValue(signedIn);
    const { setVisitedCountryAction } = await import("./visits");

    await expect(setVisitedCountryAction("SE", 1)).resolves.toEqual({
      ok: false,
      message: "The requested map update was invalid.",
    });
    expect(mocks.setVisitedCountryForUser).not.toHaveBeenCalled();
  });

  it("writes the desired state for the session user", async () => {
    mocks.getSession.mockResolvedValue(signedIn);
    const { setVisitedCountryAction } = await import("./visits");

    await expect(setVisitedCountryAction("SE", true)).resolves.toEqual({
      ok: true,
      visited: true,
    });
    expect(mocks.setVisitedCountryForUser).toHaveBeenCalledWith({
      userId: "user_1",
      countryCode: "SE",
      visited: true,
    });
  });

  it("returns a safe error when persistence fails", async () => {
    mocks.getSession.mockResolvedValue(signedIn);
    mocks.setVisitedCountryForUser.mockRejectedValue(new Error("database down"));
    const { setVisitedCountryAction } = await import("./visits");

    await expect(setVisitedCountryAction("SE", false)).resolves.toEqual({
      ok: false,
      message: "Could not save your map. Check your connection and try again.",
    });
  });
});
