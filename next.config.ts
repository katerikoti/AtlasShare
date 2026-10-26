import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Next 16 enables Turbopack for dev and build. Tailwind CSS v4 is compiled by
  // this loader in the Turbopack pipeline (the create-next-app default).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // Cache Components is intentionally disabled for now.
  //
  // AtlasShare is an authenticated, request-time application. Almost every
  // screen depends on the signed-in user, and we do not want user-specific data
  // cached by the framework by accident. Enabling Cache Components later is a
  // deliberate performance decision that requires Suspense boundaries around
  // every session read. See docs/DECISIONS.md (ADR-003).
  async headers() {
    return [
      {
        // The raw invitation token is part of the path. Keep it out of Referer
        // headers, search indexes, and shared caches even if metadata is not
        // processed (for example, a non-HTML response or a crawler).
        source: "/invite/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
