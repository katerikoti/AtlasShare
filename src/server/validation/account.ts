import { z } from "zod";

/**
 * Pure account form schemas.
 *
 * Kept out of the Server Action module so they can be unit-tested without a
 * request context. The actions still parse the raw FormData themselves.
 */
export const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(80, "Keep your name under 80 characters."),
});

export const newPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "The new passwords do not match.",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to continue."),
  confirmation: z
    .string()
    .refine((value) => value === "DELETE", {
      message: "Type DELETE (in capitals) to confirm.",
    }),
});
