"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAuth } from "@/server/auth";
import { getDb } from "@/server/db";
import { requireSession } from "@/server/session";
import {
  changePasswordSchema,
  deleteAccountSchema,
  nameSchema,
} from "@/server/validation/account";
import type { AccountActionState } from "./types";

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof APIError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return "Your current password is incorrect.";
    }
    if (error.statusCode === 400) {
      return "Check the details and try again.";
    }
  }
  return fallback;
}

export async function updateNameAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  await requireSession();

  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  try {
    await getAuth().api.updateUser({
      body: { name: parsed.data.name },
      headers: await headers(),
    });
    revalidatePath("/account");
    return { status: "success", message: "Name updated." };
  } catch {
    return {
      status: "error",
      message: "Could not update your name. Try again.",
    };
  }
}

export async function changePasswordAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requireSession();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const parsed = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  try {
    await getAuth().api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    return {
      status: "error",
      message: authErrorMessage(
        error,
        "Could not change your password. Try again.",
      ),
    };
  }

  // A password change rotates the current session. Rather than racing that
  // rotation in the client router, revoke every session and ask the user to
  // sign in again with the new password.
  await getDb()
    .session.deleteMany({ where: { userId: session.user.id } })
    .catch((error: unknown) => {
      console.error("[account] session cleanup after password change failed", {
        userId: session.user.id,
        message: error instanceof Error ? error.message : "unknown error",
      });
    });

  redirect("/sign-in?passwordChanged=1");
}

export async function deleteAccountAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requireSession();

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const parsed = deleteAccountSchema.safeParse({ password, confirmation });
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  try {
    await getAuth().api.deleteUser({
      body: { password: parsed.data.password },
      headers: await headers(),
    });
  } catch (error) {
    return {
      status: "error",
      message: authErrorMessage(
        error,
        "Could not delete your account. Try again.",
      ),
    };
  }

  console.info("[account] deleted", { userId: session.user.id });
  redirect("/?account=deleted");
}
