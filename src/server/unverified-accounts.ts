import { getDb } from "@/server/db";

type UnverifiedAccountDb = {
  user: {
    deleteMany: (args: {
      where: { email: string; emailVerified: boolean };
    }) => Promise<{ count: number }>;
  };
  verification: {
    deleteMany: (args: {
      where: { identifier: string };
    }) => Promise<{ count: number }>;
  };
};

/** Better Auth's email-OTP plugin stores a code under this identifier. */
export function verificationCodeIdentifier(email: string): string {
  return `email-verification-otp-${email}`;
}

/**
 * Remove a never-verified account for this address so a new sign-up can replace
 * it.
 *
 * Without this, someone could register another person's address (they cannot
 * verify it) and the real owner's later sign-up would hit the "already
 * registered" path and end up verifying the account that holds the first
 * person's password. An unverified account cannot sign in, so it holds no
 * sessions, visits, or memberships (invitations match by email text, not by
 * user id). Verified accounts are never touched.
 *
 * Returns whether an unverified account was removed.
 */
export async function removeUnverifiedAccount(
  rawEmail: string,
  db: UnverifiedAccountDb = getDb() as unknown as UnverifiedAccountDb,
): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return false;

  const removed = await db.user.deleteMany({
    where: { email, emailVerified: false },
  });
  if (removed.count === 0) return false;

  await db.verification.deleteMany({
    where: { identifier: verificationCodeIdentifier(email) },
  });
  return true;
}
