import type { MetadataRoute } from "next";

const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  const base = new URL(appUrl);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/invite/",
          "/account",
          "/map",
          "/shared",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/offline",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.origin,
  };
}
