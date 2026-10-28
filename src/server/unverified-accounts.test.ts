import { describe, expect, it, vi } from "vitest";

import {
  removeUnverifiedAccount,
  verificationCodeIdentifier,
} from "./unverified-accounts";

function makeDb(userCount: number) {
  const userDelete = vi.fn(async () => ({ count: userCount }));
  const verificationDelete = vi.fn(async () => ({ count: 1 }));
  return {
    db: {
      user: { deleteMany: userDelete },
      verification: { deleteMany: verificationDelete },
    },
    userDelete,
    verificationDelete,
  };
}

describe("removeUnverifiedAccount", () => {
  it("only targets never-verified accounts, by normalised email", async () => {
    const { db, userDelete } = makeDb(1);

    await removeUnverifiedAccount("  Traveller@Example.COM ", db);

    expect(userDelete).toHaveBeenCalledWith({
      where: { email: "traveller@example.com", emailVerified: false },
    });
  });

  it("clears the old code when it removes an unverified account", async () => {
    const { db, verificationDelete } = makeDb(1);

    await expect(removeUnverifiedAccount("a@example.com", db)).resolves.toBe(true);

    expect(verificationDelete).toHaveBeenCalledWith({
      where: { identifier: verificationCodeIdentifier("a@example.com") },
    });
  });

  it("does nothing else when there was no unverified account", async () => {
    const { db, verificationDelete } = makeDb(0);

    await expect(removeUnverifiedAccount("a@example.com", db)).resolves.toBe(false);

    expect(verificationDelete).not.toHaveBeenCalled();
  });

  it("ignores an empty address", async () => {
    const { db, userDelete } = makeDb(1);

    await expect(removeUnverifiedAccount("   ", db)).resolves.toBe(false);

    expect(userDelete).not.toHaveBeenCalled();
  });

  it("uses the identifier format of Better Auth's email-OTP plugin", () => {
    expect(verificationCodeIdentifier("a@example.com")).toBe(
      "email-verification-otp-a@example.com",
    );
  });
});
