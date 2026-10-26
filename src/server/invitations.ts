import { createHash, randomBytes } from "node:crypto";

/**
 * Invitation links are bearer credentials until accepted. The raw token is
 * only ever put in the email/copyable link; the database stores its SHA-256
 * hash. Thirty-two random bytes give 256 bits of entropy.
 */
export const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const invitationTtlMs = 7 * 24 * 60 * 60 * 1000;

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isInvitationToken(value: string): boolean {
  return invitationTokenPattern.test(value);
}

/**
 * Build the absolute invitation URL from the configured origin. The token is
 * base64url, so it is safe as a single path segment.
 */
export function buildInvitationUrl(appUrl: string, token: string): string {
  const url = new URL("/invite", appUrl);
  url.pathname = `/invite/${token}`;
  return url.toString();
}
