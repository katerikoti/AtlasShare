import { describe, expect, it, vi } from "vitest";

import {
  sendWelcomeEmailOnce,
  type WelcomeEmailDeps,
} from "./index";
import type { MailMessage, MailResult } from "./mailer";

function makeDeps(overrides: Partial<WelcomeEmailDeps> = {}) {
  const sent: MailMessage[] = [];
  const released: string[] = [];
  let claims = 1;

  const deps: WelcomeEmailDeps = {
    claim: vi.fn(async () => claims),
    release: vi.fn(async (userId: string) => {
      released.push(userId);
    }),
    send: vi.fn(async (message: MailMessage): Promise<MailResult> => {
      sent.push(message);
      return { status: "sent", id: "email_1" };
    }),
    now: () => new Date("2026-10-25T12:00:00Z"),
    appUrl: "https://atlasshare.example",
    ...overrides,
  };

  return {
    deps,
    sent,
    released,
    setClaims: (value: number) => {
      claims = value;
    },
  };
}

const user = {
  id: "user_1",
  name: "Sam Traveller",
  email: "sam@example.com",
};

describe("sendWelcomeEmailOnce", () => {
  it("claims the user and sends exactly one email", async () => {
    const { deps, sent } = makeDeps();

    const outcome = await sendWelcomeEmailOnce(user, deps);

    expect(outcome).toBe("sent");
    expect(deps.claim).toHaveBeenCalledWith(user.id, expect.any(Date));
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(user.email);
    expect(sent[0]?.subject).toContain("Welcome");
  });

  it("does nothing when the user was already welcomed", async () => {
    const { deps, sent } = makeDeps();
    (deps.claim as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const outcome = await sendWelcomeEmailOnce(user, deps);

    expect(outcome).toBe("already-sent");
    expect(sent).toHaveLength(0);
    expect(deps.release).not.toHaveBeenCalled();
  });

  it("releases the claim when email is not configured", async () => {
    const { deps, released } = makeDeps({
      send: async () => ({ status: "skipped", reason: "not-configured" }),
    });

    const outcome = await sendWelcomeEmailOnce(user, deps);

    expect(outcome).toBe("skipped");
    expect(released).toEqual([user.id]);
  });

  it("releases the claim and rethrows when sending fails", async () => {
    const { deps, released } = makeDeps({
      send: async () => {
        throw new Error("provider down");
      },
    });

    await expect(sendWelcomeEmailOnce(user, deps)).rejects.toThrow(
      "provider down",
    );
    expect(released).toEqual([user.id]);
  });
});
