import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  buildInvitationUrl,
  generateInvitationToken,
  hashInvitationToken,
  invitationTtlMs,
  isInvitationToken,
} from "./invitations";

describe("invitation tokens", () => {
  it("generates 256-bit base64url tokens", () => {
    const first = generateInvitationToken();
    const second = generateInvitationToken();

    expect(first).toHaveLength(43);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(isInvitationToken(first)).toBe(true);
  });

  it("stores a SHA-256 hash rather than the raw token", () => {
    const token = generateInvitationToken();
    const hash = hashInvitationToken(token);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
    expect(hash).toBe(createHash("sha256").update(token, "utf8").digest("hex"));
  });

  it("rejects malformed tokens before lookup", () => {
    expect(isInvitationToken("short")).toBe(false);
    expect(isInvitationToken("a".repeat(44))).toBe(false);
    expect(isInvitationToken(`${"a".repeat(42)}+`)).toBe(false);
  });

  it("builds the invitation path from the configured origin", () => {
    const token = generateInvitationToken();

    expect(buildInvitationUrl("https://atlasshare.example", token)).toBe(
      `https://atlasshare.example/invite/${token}`,
    );
  });

  it("keeps the documented seven-day lifetime", () => {
    expect(invitationTtlMs).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
