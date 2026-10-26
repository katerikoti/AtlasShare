import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  deleteMany: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mocks.redirect(url),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/server/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: mocks.getSession,
      updateUser: mocks.updateUser,
      changePassword: mocks.changePassword,
      deleteUser: mocks.deleteUser,
    },
  }),
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({ session: { deleteMany: mocks.deleteMany } }),
}));

const idle = { status: "idle" } as const;

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetModules();
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`redirect:${url}`);
  });
  mocks.deleteMany.mockResolvedValue({ count: 0 });
});

describe("account actions without a session", () => {
  it("rejects name updates before touching the auth API", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { updateNameAction } = await import("./account");

    await expect(
      updateNameAction(idle, form({ name: "New name" })),
    ).rejects.toThrow("redirect:/sign-in");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("rejects password changes before touching the auth API", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { changePasswordAction } = await import("./account");

    await expect(
      changePasswordAction(
        idle,
        form({
          currentPassword: "old long password",
          newPassword: "new long password",
          confirmPassword: "new long password",
        }),
      ),
    ).rejects.toThrow("redirect:/sign-in");
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it("rejects account deletion before touching the auth API", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { deleteAccountAction } = await import("./account");

    await expect(
      deleteAccountAction(
        idle,
        form({ password: "a long password", confirmation: "DELETE" }),
      ),
    ).rejects.toThrow("redirect:/sign-in");
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});

describe("account action validation", () => {
  it("trims a valid name and updates the user", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
    });
    mocks.updateUser.mockResolvedValue({});
    const { updateNameAction } = await import("./account");

    const state = await updateNameAction(idle, form({ name: "  Ada  " }));

    expect(state).toEqual({ status: "success", message: "Name updated." });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      body: { name: "Ada" },
      headers: expect.any(Headers),
    });
  });

  it("rejects an empty name without calling the auth API", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
    });
    const { updateNameAction } = await import("./account");

    const state = await updateNameAction(idle, form({ name: "   " }));

    expect(state).toEqual({ status: "error", message: "Enter a name." });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("revokes all sessions and redirects after a successful password change", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
    });
    mocks.changePassword.mockResolvedValue({});
    const { changePasswordAction } = await import("./account");

    await expect(
      changePasswordAction(
        idle,
        form({
          currentPassword: "old long password",
          newPassword: "new long password",
          confirmPassword: "new long password",
        }),
      ),
    ).rejects.toThrow("redirect:/sign-in?passwordChanged=1");

    expect(mocks.changePassword).toHaveBeenCalledWith({
      body: {
        currentPassword: "old long password",
        newPassword: "new long password",
        revokeOtherSessions: true,
      },
      headers: expect.any(Headers),
    });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
  });

  it("rejects a mismatched password confirmation without calling the auth API", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
    });
    const { changePasswordAction } = await import("./account");

    const state = await changePasswordAction(
      idle,
      form({
        currentPassword: "old long password",
        newPassword: "new long password",
        confirmPassword: "different long password",
      }),
    );

    expect(state).toEqual({
      status: "error",
      message: "The new passwords do not match.",
    });
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it("rejects account deletion without the exact confirmation", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
    });
    const { deleteAccountAction } = await import("./account");

    const state = await deleteAccountAction(
      idle,
      form({ password: "a long password", confirmation: "delete" }),
    );

    expect(state).toEqual({
      status: "error",
      message: "Type DELETE (in capitals) to confirm.",
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
