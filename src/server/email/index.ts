import { getEnv } from "@/config/env";
import { getDb } from "@/server/db";
import { getMailer, type MailMessage, type MailResult } from "./mailer";
import {
  renderPasswordResetEmail,
  renderWelcomeEmail,
} from "./templates";

export type WelcomeEmailDeps = {
  claim: (userId: string, at: Date) => Promise<number>;
  release: (userId: string) => Promise<void>;
  send: (message: MailMessage) => Promise<MailResult>;
  now: () => Date;
  appUrl: string;
};

function defaultWelcomeDeps(): WelcomeEmailDeps {
  const db = getDb();
  const mailer = getMailer();

  return {
    claim: async (userId, at) => {
      const result = await db.user.updateMany({
        where: { id: userId, welcomeEmailSentAt: null },
        data: { welcomeEmailSentAt: at },
      });
      return result.count;
    },
    release: async (userId) => {
      await db.user.updateMany({
        where: { id: userId },
        data: { welcomeEmailSentAt: null },
      });
    },
    send: (message) => mailer.send(message),
    now: () => new Date(),
    appUrl: getEnv().NEXT_PUBLIC_APP_URL,
  };
}

export type WelcomeEmailOutcome = "sent" | "already-sent" | "skipped";

/**
 * Send the welcome email at most once per account.
 *
 * The row is claimed before sending so two concurrent sign-ups cannot both
 * send. A failed or skipped send releases the claim so a later run can retry.
 * This never throws into account creation.
 */
export async function sendWelcomeEmailOnce(
  user: { id: string; name: string; email: string },
  deps: WelcomeEmailDeps = defaultWelcomeDeps(),
): Promise<WelcomeEmailOutcome> {
  const claimed = await deps.claim(user.id, deps.now());
  if (claimed === 0) return "already-sent";

  const rendered = renderWelcomeEmail({ name: user.name, appUrl: deps.appUrl });

  try {
    const result = await deps.send({
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (result.status === "skipped") {
      await deps.release(user.id);
      return "skipped";
    }

    return "sent";
  } catch (error) {
    await deps.release(user.id).catch(() => undefined);
    throw error;
  }
}

/**
 * Password-reset email.
 *
 * Called by Better Auth. Failures are logged and swallowed so the HTTP response
 * stays generic and does not reveal whether the address exists.
 */
export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const { NEXT_PUBLIC_APP_URL } = getEnv();
  const resetUrl = new URL("/reset-password", NEXT_PUBLIC_APP_URL);
  resetUrl.searchParams.set("token", input.token);

  const rendered = renderPasswordResetEmail({
    name: input.name,
    resetUrl: resetUrl.toString(),
    expiresInMinutes: 60,
  });

  try {
    await getMailer().send({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (error) {
    console.error("[email] password reset send failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
  }
}
