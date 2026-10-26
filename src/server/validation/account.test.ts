import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  deleteAccountSchema,
  nameSchema,
  newPasswordSchema,
} from "./account";

describe("nameSchema", () => {
  it("trims a valid display name", () => {
    const result = nameSchema.safeParse({ name: "  Ada Lovelace  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Ada Lovelace");
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(nameSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name longer than 80 characters", () => {
    expect(nameSchema.safeParse({ name: "a".repeat(81) }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("requires at least 12 characters", () => {
    expect(newPasswordSchema.safeParse("short").success).toBe(false);
    expect(newPasswordSchema.safeParse("twelve chars").success).toBe(true);
  });

  it("caps the password at 128 characters", () => {
    expect(newPasswordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching new passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old long password",
      newPassword: "new long password",
      confirmPassword: "new long password",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched confirmation", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old long password",
      newPassword: "new long password",
      confirmPassword: "different long password",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "The new passwords do not match.",
      );
    }
  });

  it("requires the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "new long password",
      confirmPassword: "new long password",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("accepts a password and the exact DELETE confirmation", () => {
    expect(
      deleteAccountSchema.safeParse({
        password: "a long password",
        confirmation: "DELETE",
      }).success,
    ).toBe(true);
  });

  it("rejects a lowercase confirmation with a helpful message", () => {
    const result = deleteAccountSchema.safeParse({
      password: "a long password",
      confirmation: "delete",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Type DELETE (in capitals) to confirm.",
      );
    }
  });

  it("requires the password", () => {
    expect(
      deleteAccountSchema.safeParse({ password: "", confirmation: "DELETE" })
        .success,
    ).toBe(false);
  });
});
