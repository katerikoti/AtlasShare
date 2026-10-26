import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";
import {
  renderPasswordResetEmail,
  renderWelcomeEmail,
} from "./templates";

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
