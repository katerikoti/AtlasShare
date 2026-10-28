import { describe, expect, it, vi } from "vitest";

import { sendVerificationCodeEmail, type VerificationCodeDeps } from "./index";
import type { MailMessage, MailResult } from "./mailer";

function makeDeps(
  overrides: Partial<VerificationCodeDeps> & {
    result?: MailResult;
    throws?: Error;
  } = {},
) {
  const sent: MailMessage[] = [];
  const info = vi.fn();
  const error = vi.fn();

  const deps: VerificationCodeDeps = {
    send: vi.fn(async (message: MailMessage): Promise<MailResult> => {
      sent.push(message);
      if (overrides.throws) throw overrides.throws;
      return overrides.result ?? { status: "sent", id: "email_1" };
    }),
    isProduction: overrides.isProduction ?? false,
    log: { info, error },
  };

  return { deps, sent, info, error };
}

const input = { to: "traveller@example.com", code: "123456", expiresInMinutes: 10 };

describe("sendVerificationCodeEmail", () => {
  it("emails the code and does not log it when delivery succeeds", async () => {
    const { deps, sent, info } = makeDeps();

    await expect(sendVerificationCodeEmail(input, deps)).resolves.toBe("sent");

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("traveller@example.com");
    expect(sent[0].text).toContain("123456");
    expect(info).not.toHaveBeenCalled();
  });

  it("prints the code in development when no email is configured", async () => {
    const { deps, info } = makeDeps({
      result: { status: "skipped", reason: "no key" },
    });

    await expect(sendVerificationCodeEmail(input, deps)).resolves.toBe("skipped");

    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0][0])).toContain("123456");
    expect(String(info.mock.calls[0][0])).toContain("development only");
  });

  it("prints the code in development when delivery fails, without throwing", async () => {
    const { deps, info, error } = makeDeps({
      throws: new Error("Brevo rejected the message (401)"),
    });

    await expect(sendVerificationCodeEmail(input, deps)).resolves.toBe("failed");

    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(error.mock.calls)).not.toContain("123456");
    expect(String(info.mock.calls[0][0])).toContain("123456");
  });

  it("never logs the code in production, even when delivery fails", async () => {
    const failed = makeDeps({ isProduction: true, throws: new Error("down") });
    await expect(sendVerificationCodeEmail(input, failed.deps)).resolves.toBe(
      "failed",
    );
    expect(failed.info).not.toHaveBeenCalled();
    expect(JSON.stringify(failed.error.mock.calls)).not.toContain("123456");

    const skipped = makeDeps({
      isProduction: true,
      result: { status: "skipped", reason: "no key" },
    });
    await expect(sendVerificationCodeEmail(input, skipped.deps)).resolves.toBe(
      "skipped",
    );
    expect(skipped.info).not.toHaveBeenCalled();
  });
});
