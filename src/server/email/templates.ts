import { brand } from "@/config/brand";

/**
 * Plain HTML email templates.
 *
 * Inline styles only (email clients strip stylesheets), no remote images, no
 * tracking pixels. Everything here is a pure function so it can be unit tested
 * without sending anything.
 */

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(options: {
  preview: string;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
  footnote?: string;
}): string {
  const { preview, heading, body, cta, footnote } = options;
  const p = brand.palette;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${p.canvas};color:${p.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${p.canvas};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${p.surface};border:1px solid ${p.line};border-radius:24px;padding:40px;">
            <tr>
              <td style="padding-bottom:28px;">
                <span style="display:inline-block;background-color:${p.moss};color:${p.canvas};width:36px;height:36px;line-height:36px;text-align:center;border-radius:999px;font-weight:600;">A</span>
                <span style="font-size:20px;font-weight:600;margin-left:10px;vertical-align:middle;color:${p.ink};">${escapeHtml(brand.name)}</span>
              </td>
            </tr>
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:600;color:${p.ink};">${escapeHtml(heading)}</h1>
                ${body}
                ${
                  cta
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="border-radius:999px;background-color:${p.moss};"><a href="${escapeHtml(
                        cta.href,
                      )}" style="display:inline-block;padding:12px 22px;color:${p.canvas};text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(
                        cta.label,
                      )}</a></td></tr></table>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;border-top:1px solid ${p.line};font-size:13px;line-height:1.6;color:${p.inkMuted};">
                ${footnote ? `<p style="margin:0 0 12px;">${footnote}</p>` : ""}
                <p style="margin:0;">${escapeHtml(brand.name)} — ${escapeHtml(brand.tagline)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3a403b;">${escapeHtml(
    text,
  )}</p>`;
}

/**
 * Links in emails are inserted as escaped hrefs. They are always built from
 * configuration + a server-generated token, never from user input.
 */
export function renderWelcomeEmail(input: {
  name: string;
  appUrl: string;
}): RenderedEmail {
  const firstName = input.name.trim().split(/\s+/)[0] || "traveller";
  const url = new URL("/account", input.appUrl).toString();

  return {
    subject: `Welcome to ${brand.name}`,
    html: layout({
      preview: "Your map is ready when you are.",
      heading: `Welcome, ${firstName}`,
      body:
        paragraph(
          `${brand.name} keeps a private map of the countries you have visited — and, when you want, combines it with the people you travel with.`,
        ) +
        paragraph(
          "Start by marking your first country. You can always add more later.",
        ),
      cta: { label: "Open your account", href: url },
      footnote:
        "You received this because an account was created with this address. If that was not you, you can ignore this email.",
    }),
    text: [
      `Welcome to ${brand.name}, ${firstName}.`,
      "",
      "Mark the countries you have visited on your own map, then combine it with the people you travel with.",
      "",
      `Open your account: ${url}`,
      "",
      `— ${brand.name}`,
    ].join("\n"),
  };
}

/**
 * Email-verification code. It contains only the code and its lifetime: no link
 * (so there is nothing to click through a phishing page), no account data.
 */
export function renderVerificationCodeEmail(input: {
  code: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const p = brand.palette;
  const spaced = input.code.split("").join(" ");

  return {
    subject: `Your ${brand.name} verification code`,
    html: layout({
      preview: "Enter this code to finish creating your account.",
      heading: "Verify your email",
      body:
        paragraph(
          `Enter this code in ${brand.name} to confirm your email address and finish creating your account.`,
        ) +
        `<p style="margin:8px 0 20px;padding:18px 0;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;letter-spacing:6px;font-weight:700;color:${p.ink};background-color:${p.canvas};border-radius:16px;">${escapeHtml(
          spaced,
        )}</p>` +
        paragraph(
          `The code expires in ${input.expiresInMinutes} minutes. Never share it with anyone.`,
        ),
      footnote:
        "If you did not try to create an account, you can ignore this email. No account is usable until the code is entered.",
    }),
    text: [
      `Your ${brand.name} verification code is: ${input.code}`,
      "",
      `Enter it to confirm your email address. It expires in ${input.expiresInMinutes} minutes. Never share it with anyone.`,
      "",
      "If you did not try to create an account, ignore this email.",
      "",
      `— ${brand.name}`,
    ].join("\n"),
  };
}

export function renderPasswordResetEmail(input: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const firstName = input.name.trim().split(/\s+/)[0] || "there";

  return {
    subject: `Reset your ${brand.name} password`,
    html: layout({
      preview: "A password reset was requested for your account.",
      heading: "Reset your password",
      body:
        paragraph(`Hi ${firstName}, we received a request to reset your password.`) +
        paragraph(
          `This link expires in ${input.expiresInMinutes} minutes and can be used once.`,
        ),
      cta: { label: "Choose a new password", href: input.resetUrl },
      footnote:
        "If you did not request this, you can ignore this email — your password will not change. For your security, this link only works once.",
    }),
    text: [
      `Hi ${firstName},`,
      "",
      "We received a request to reset your password.",
      `Choose a new password (expires in ${input.expiresInMinutes} minutes, single use): ${input.resetUrl}`,
      "",
      "If you did not request this, ignore this email — your password will not change.",
      "",
      `— ${brand.name}`,
    ].join("\n"),
  };
}

/**
 * Invitation email. It intentionally contains no inviter address, invited
 * address, member names, or other account data — only the map name and the
 * single-use link.
 */
export function renderInvitationEmail(input: {
  mapName: string;
  inviteUrl: string;
  expiresInDays: number;
}): RenderedEmail {
  return {
    subject: `You're invited to a shared map on ${brand.name}`,
    html: layout({
      preview: "Someone added you to a private shared map.",
      heading: "You're invited to a shared map",
      body:
        paragraph(
          `You have been invited to join “${input.mapName}” on ${brand.name}.`,
        ) +
        paragraph(
          `The invitation expires in ${input.expiresInDays} days and can be used once. It only works for the email address that received it.`,
        ),
      cta: { label: "Open the invitation", href: input.inviteUrl },
      footnote:
        "If you were not expecting this invitation, you can ignore it. No map data is shown until you sign in with the invited email address and accept.",
    }),
    text: [
      `You have been invited to join “${input.mapName}” on ${brand.name}.`,
      "",
      `Accept the invitation (expires in ${input.expiresInDays} days, single use): ${input.inviteUrl}`,
      "",
      "This link only works for the email address that received it.",
      "If you were not expecting this invitation, ignore this email.",
      "",
      `— ${brand.name}`,
    ].join("\n"),
  };
}
