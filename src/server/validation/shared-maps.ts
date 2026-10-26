import { z } from "zod";

/**
 * Pure shared-map form schemas.
 *
 * The Server Actions parse raw FormData through these schemas, then re-check
 * session + membership before touching the database. Keeping the schemas in a
 * separate module makes the boundary rules unit-testable without a request.
 */
export const mapIdSchema = z.string().trim().min(1).max(64);
export const membershipIdSchema = z.string().trim().min(1).max(64);
export const invitationIdSchema = z.string().trim().min(1).max(64);

export const mapNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a map name.")
  .max(80, "Keep the map name under 80 characters.");

export const mapDescriptionSchema = z
  .string()
  .trim()
  .max(280, "Keep the description under 280 characters.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const createSharedMapSchema = z
  .object({
    name: mapNameSchema,
    description: mapDescriptionSchema,
  })
  .strict();

export const updateSharedMapSchema = z
  .object({
    mapId: mapIdSchema,
    name: mapNameSchema,
    description: mapDescriptionSchema,
  })
  .strict();

export const deleteSharedMapSchema = z
  .object({
    mapId: mapIdSchema,
    confirmation: z
      .string()
      .refine((value) => value === "DELETE", {
        message: "Type DELETE (in capitals) to confirm.",
      }),
  })
  .strict();

export const inviteMemberSchema = z
  .object({
    mapId: mapIdSchema,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(320, "Keep the email address under 320 characters.")
      .pipe(z.email()),
  })
  .strict();

export const revokeInvitationSchema = z
  .object({
    mapId: mapIdSchema,
    invitationId: invitationIdSchema,
  })
  .strict();

export const removeMemberSchema = z
  .object({
    mapId: mapIdSchema,
    membershipId: membershipIdSchema,
  })
  .strict();

export const leaveSharedMapSchema = z
  .object({
    mapId: mapIdSchema,
  })
  .strict();

export const invitationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "That invitation link is not valid.");

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
