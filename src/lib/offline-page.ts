import { brand } from "@/config/brand";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * A self-contained offline document.
 *
 * It deliberately uses inline styles and no scripts or remote assets so the
 * service worker can serve it on a failed navigation without its normal Next.js
 * chunks. It contains no account, map, or visit data.
 */
export function renderOfflinePage(): string {
  const p = brand.palette;
  const name = escapeHtml(brand.name);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="${p.canvas}" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Offline · ${name}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        background: ${p.canvas};
        color: ${p.ink};
        display: grid;
        min-height: 100dvh;
        place-items: center;
        padding: 24px;
      }
      main {
        background: ${p.surface};
        border: 1px solid ${p.line};
        border-radius: 32px;
        box-shadow: 0 30px 80px -48px rgb(43 48 44 / 0.55);
        max-width: 32rem;
        padding: 44px;
        width: 100%;
      }
      .mark {
        background: ${p.moss};
        border-radius: 999px;
        color: ${p.canvas};
        display: grid;
        font-family: ui-serif, Georgia, "Iowan Old Style", serif;
        font-size: 22px;
        height: 48px;
        place-items: center;
        width: 48px;
      }
      .eyebrow {
        color: ${p.moss};
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.2em;
        margin: 28px 0 0;
        text-transform: uppercase;
      }
      h1 {
        font-family: ui-serif, Georgia, "Iowan Old Style", serif;
        font-size: clamp(36px, 8vw, 52px);
        font-weight: 500;
        letter-spacing: -0.03em;
        line-height: 1.05;
        margin: 12px 0 0;
      }
      p { color: ${p.inkMuted}; font-size: 16px; line-height: 1.65; margin: 18px 0 0; }
      .note {
        border-top: 1px solid ${p.line};
        font-size: 14px;
        margin-top: 28px;
        padding-top: 20px;
      }
      a {
        background: ${p.moss};
        border-radius: 999px;
        color: ${p.canvas};
        display: inline-block;
        font-size: 15px;
        font-weight: 600;
        margin-top: 28px;
        padding: 12px 22px;
        text-decoration: none;
      }
      a:hover { background: ${p.ink}; }
      a:focus-visible {
        outline: 2px solid ${p.moss};
        outline-offset: 4px;
      }
      @media (max-width: 420px) {
        main { padding: 32px 26px; }
      }
      @media (prefers-reduced-motion: reduce) {
        * { transition: none !important; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true">A</div>
      <p class="eyebrow">Offline</p>
      <h1>You’re offline.</h1>
      <p>
        ${name}’s offline shell is here, but your map needs a connection.
        Reconnect, then try again.
      </p>
      <p class="note">
        No private map data is stored in the offline cache.
      </p>
      <a href="/">Try again</a>
    </main>
  </body>
</html>
`;
}
