import { describe, expect, it, vi } from "vitest";

import { createBrevoMailer, parseSender } from "./mailer";

const message = {
  to: "sam@example.com",
  subject: "Welcome to AtlasShare",
  html: "<p>Hello</p>",
  text: "Hello",
};

function jsonResponse(body: unknown, status = 201) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("parseSender", () => {
  it("parses a display name and address", () => {
    expect(parseSender("AtlasShare <hello@example.com>")).toEqual({
      name: "AtlasShare",
      email: "hello@example.com",
    });
  });

  it("accepts a bare email address", () => {
    expect(parseSender("hello@example.com")).toEqual({
      email: "hello@example.com",
    });
  });

  it("rejects an invalid address", () => {
    expect(() => parseSender("AtlasShare <not-an-email>")).toThrow(
      /EMAIL_FROM/,
    );
  });
});

describe("createBrevoMailer", () => {
  it("posts a transactional email to Brevo", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ messageId: "brevo_123" }),
    );
    const mailer = createBrevoMailer(
      "xkeysib-test",
      "AtlasShare <hello@example.com>",
      fetchImpl,
    );

    const result = await mailer.send(message);

    expect(result).toEqual({ status: "sent", id: "brevo_123" });
    expect(fetchImpl).toHaveBeenCalledOnce();

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      accept: "application/json",
      "api-key": "xkeysib-test",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      sender: { name: "AtlasShare", email: "hello@example.com" },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    });
  });

  it("includes the provider message in errors", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ message: "Sender is not verified" }, 400),
    );
    const mailer = createBrevoMailer(
      "xkeysib-test",
      "AtlasShare <hello@example.com>",
      fetchImpl,
    );

    await expect(mailer.send(message)).rejects.toThrow(
      "Brevo rejected the message (400): Sender is not verified",
    );
  });

  it("accepts a success response with no JSON body", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    }));
    const mailer = createBrevoMailer(
      "xkeysib-test",
      "hello@example.com",
      fetchImpl,
    );

    await expect(mailer.send(message)).resolves.toEqual({ status: "sent" });
  });
});
