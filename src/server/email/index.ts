import { getEnv } from "@/config/env";
import { getDb } from "@/server/db";
import { getMailer, type MailMessage, type MailResult } from "./mailer";
import {
  renderInvitationEmail,
  renderPasswordResetEmail,
  renderVerificationCodeEmail,
  renderWelcomeEmail,
} from "./templates";

export type VerificationCodeDeps = {
  send: (message: MailMessage) => Promise<MailResult>;
  isProduction: boolean;
  log: Pick<Console, "info" | "error">;
};

function defaultVerificationCodeDeps(): VerificationCodeDeps {
  const mailer = getMailer();
  return {
    send: (message) => mailer.send(message),
    isProduction: getEnv().NODE_ENV === "production",
    log: console,
  };
}

export type VerificationCodeOutcome = "sent" | "skipped" | "failed";

/**
 * Email the 6-digit verification code.
 *
 * Never throws, so account creation and sign-in responses stay generic. If the
 * message cannot be delivered (no Brevo key, or Brevo rejects the request, for
 * example because this machine's IP is not authorised), the code is printed to
 * the server console in development only so sign-up can still be finished
 * locally. In production the code is never logged, and the person can use
 * "Send a new code".
 */
export async function sendVerificationCodeEmail(
  input: { to: string; code: string; expiresInMinutes: number },
  deps: VerificationCodeDeps = defaultVerificationCodeDeps(),
): Promise<VerificationCodeOutcome> {
  const rendered = renderVerificationCodeEmail({
    code: input.code,
    expiresInMinutes: input.expiresInMinutes,
  });

  let outcome: VerificationCodeOutcome;
  try {
    const result = await deps.send({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    outcome = result.status;
  } catch (error) {
    deps.log.error("[email] verification code send failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    outcome = "failed";
  }

  if (outcome !== "sent" && !deps.isProduction) {
    deps.log.info(
      `[email] (development only) verification code for ${input.to}: ${input.code}`,
    );
  }

  return outcome;
}

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

export type InvitationEmailOutcome = "sent" | "skipped" | "failed";

/**
 * Invitation email is best-effort: the invitation row and copyable link remain
 * valid even if Brevo is down or not configured. Never log the recipient, map
 * name, or token.
 */
export async function sendInvitationEmail(input: {
  to: string;
  mapName: string;
  inviteUrl: string;
  expiresInDays: number;
}): Promise<InvitationEmailOutcome> {
  const rendered = renderInvitationEmail({
    mapName: input.mapName,
    inviteUrl: input.inviteUrl,
    expiresInDays: input.expiresInDays,
  });

  try {
    const result = await getMailer().send({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return result.status;
  } catch (error) {
    console.error("[email] invitation send failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return "failed";
  }
}
