import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = new URL(appUrl);

  return [
    {
      url: new URL("/", base).toString(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: new URL("/privacy", base).toString(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: new URL("/install", base).toString(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
