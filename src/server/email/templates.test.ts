import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";
import {
  renderInvitationEmail,
  renderPasswordResetEmail,
  renderVerificationCodeEmail,
  renderWelcomeEmail,
} from "./templates";

describe("renderVerificationCodeEmail", () => {
  it("shows the code, its lifetime, and the brand", () => {
    const email = renderVerificationCodeEmail({
      code: "482913",
      expiresInMinutes: 10,
    });

    expect(email.subject).toBe(`Your ${brand.name} verification code`);
    expect(email.text).toContain("482913");
    expect(email.text).toContain("10 minutes");
    // The HTML spaces the digits so they are easy to read and copy by eye.
    expect(email.html).toContain("4 8 2 9 1 3");
    expect(email.html).toContain("10 minutes");
  });

  it("contains no link or account data, only the code", () => {
    const email = renderVerificationCodeEmail({
      code: "000111",
      expiresInMinutes: 10,
    });

    expect(email.html).not.toContain("<a ");
    expect(email.html).not.toContain("href");
    expect(email.text).not.toContain("http");
    expect(email.text).not.toContain("@");
    expect(email.html).not.toContain("userId");
  });

  it("escapes anything that is not a plain code", () => {
    const email = renderVerificationCodeEmail({
      code: "<b>1</b>",
      expiresInMinutes: 10,
    });

    expect(email.html).not.toContain("<b>");
    expect(email.html).toContain("&lt;");
  });
});

describe("renderWelcomeEmail", () => {
  it("addresses the user and links to the account", () => {
    const email = renderWelcomeEmail({
      name: "Katerina Mäenpää",
      appUrl: "https://atlasshare.example",
    });

    expect(email.subject).toContain(brand.name);
    expect(email.html).toContain("Katerina");
    expect(email.html).toContain("https://atlasshare.example/account");
    expect(email.text).toContain("https://atlasshare.example/account");
  });

  it("escapes user-provided text instead of injecting markup", () => {
    const email = renderWelcomeEmail({
      name: '<script>alert("x")</script>',
      appUrl: "https://atlasshare.example",
    });

    expect(email.html).not.toContain("<script>alert");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("falls back to a neutral greeting for an empty name", () => {
    const email = renderWelcomeEmail({
      name: "   ",
      appUrl: "https://atlasshare.example",
    });

    expect(email.html).toContain("Welcome, traveller");
  });

  it("contains no reset or invitation token", () => {
    const email = renderWelcomeEmail({
      name: "Sam",
      appUrl: "https://atlasshare.example",
    });

    expect(email.html.toLowerCase()).not.toContain("token");
  });
});

describe("renderPasswordResetEmail", () => {
  const resetUrl =
    "https://atlasshare.example/reset-password?token=abc123%2Fdef";

  it("includes the single-use reset link and its lifetime", () => {
    const email = renderPasswordResetEmail({
      name: "Sam",
      resetUrl,
      expiresInMinutes: 60,
    });

    expect(email.subject).toContain(brand.name);
    expect(email.html).toContain(resetUrl.replaceAll("&", "&amp;"));
    expect(email.text).toContain(resetUrl);
    expect(email.text).toContain("60 minutes");
    expect(email.text).toContain("single use");
  });

  it("tells the user what to do if they did not request it", () => {
    const email = renderPasswordResetEmail({
      name: "Sam",
      resetUrl,
      expiresInMinutes: 60,
    });

    expect(email.text).toMatch(/did not request/i);
  });
});

describe("renderInvitationEmail", () => {
  const inviteUrl =
    "https://atlasshare.example/invite/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abc";

  it("includes the map name, single-use link, and expiry", () => {
    const email = renderInvitationEmail({
      mapName: "Summer in the Nordics",
      inviteUrl,
      expiresInDays: 7,
    });

    expect(email.subject).toContain(brand.name);
    expect(email.html).toContain("Summer in the Nordics");
    expect(email.html).toContain(inviteUrl);
    expect(email.text).toContain(inviteUrl);
    expect(email.text).toContain("7 days");
    expect(email.text).toContain("single use");
  });

  it("escapes a user-provided map name", () => {
    const email = renderInvitationEmail({
      mapName: '<script>alert("x")</script>',
      inviteUrl,
      expiresInDays: 7,
    });

    expect(email.html).not.toContain("<script>alert");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("contains no invited address, account metadata, or notes", () => {
    const email = renderInvitationEmail({
      mapName: "Weekend away",
      inviteUrl,
      expiresInDays: 7,
    });

    expect(email.html).not.toContain("userId");
    expect(email.html).not.toContain("emailVerified");
    expect(email.html).not.toContain("firstVisitedAt");
    expect(email.text).not.toContain("@");
  });
});
