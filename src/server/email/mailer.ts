import { z } from "zod";

import { getEnv } from "@/config/env";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult =
  | { status: "sent"; id?: string }
  | { status: "skipped"; reason: string };

export interface Mailer {
  send(message: MailMessage): Promise<MailResult>;
}

type FetchLike = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;

export type Sender = {
  email: string;
  name?: string;
};

const brevoEndpoint = "https://api.brevo.com/v3/smtp/email";

/**
 * Parse the `Name <email@example.com>` form used by EMAIL_FROM. Brevo expects
 * the sender name and address as separate fields.
 */
export function parseSender(value: string): Sender {
  const trimmed = value.trim();
  const match = /^(.*?)\s*<([^<>]+)>$/.exec(trimmed);
  const email = (match?.[2] ?? trimmed).trim();
  const name = match?.[1]
    ?.trim()
    .replace(/^"(.*)"$/, "$1")
    .trim();

  if (!z.email().safeParse(email).success) {
    throw new Error("EMAIL_FROM must contain a valid email address");
  }

  return name ? { name, email } : { email };
}

async function providerError(response: Pick<Response, "status" | "json">) {
  let detail = "";

  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === "string") detail = message.trim();
    }
  } catch {
    // A non-JSON error response is still an error; the status is enough.
  }

  return new Error(
    `Brevo rejected the message (${response.status})${detail ? `: ${detail}` : ""}`,
  );
}

/**
 * Brevo-backed mailer.
 *
 * Uses the transactional email HTTP API directly instead of an SDK. Throws on
 * provider errors so callers can decide whether to retry; product callers never
 * roll back the primary action because an email failed.
 */
export function createBrevoMailer(
  apiKey: string,
  from: string,
  fetchImpl: FetchLike = fetch,
): Mailer {
  const sender = parseSender(from);

  return {
    async send(message) {
      const response = await fetchImpl(brevoEndpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw await providerError(response);
      }

      let id: string | undefined;
      try {
        const body = (await response.json()) as { messageId?: unknown };
        if (typeof body.messageId === "string") id = body.messageId;
      } catch {
        // The message was accepted even if the response body could not be read.
      }

      return { status: "sent", id };
    },
  };
}

/**
 * Used when BREVO_API_KEY is not configured (local development, early
 * previews). It logs only the subject line — never the recipient, body, or
 * tokens.
 */
function createNoopMailer(): Mailer {
  return {
    async send(message) {
      console.warn(
        `[email] BREVO_API_KEY is not set; skipped "${message.subject}"`,
      );
      return { status: "skipped", reason: "not-configured" };
    },
  };
}

let cached: Mailer | undefined;

export function getMailer(): Mailer {
  if (cached) return cached;

  const env = getEnv();
  const apiKey = env.BREVO_API_KEY?.trim();

  cached = apiKey
    ? createBrevoMailer(apiKey, env.EMAIL_FROM)
    : createNoopMailer();

  return cached;
}

export function resetMailerForTests(): void {
  cached = undefined;
}
