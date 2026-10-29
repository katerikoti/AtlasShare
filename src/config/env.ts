import { z } from "zod";

import { brand } from "@/config/brand";

/**
 * Server environment validation.
 *
 * Validation is lazy: importing this module never throws, so `next build` can
 * compile routes without runtime secrets. The first call that actually needs
 * configuration fails fast with a readable message.
 *
 * Never import this module from a Client Component.
 */
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.string().url(),
    BREVO_API_KEY: z.string().optional(),
    EMAIL_FROM: z
      .string()
      .min(1)
      .default(`${brand.name} <hello@example.com>`),
    TEST_DATABASE_URL: z.string().min(1).optional(),
  })
  .passthrough();

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${details}`);
  }

  const data = parsed.data;
  const appUrl = data.APP_URL || data.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error(
      "Invalid environment configuration — APP_URL or NEXT_PUBLIC_APP_URL: Required",
    );
  }

  cached = { ...data, APP_URL: appUrl, NEXT_PUBLIC_APP_URL: appUrl } as ServerEnv;
  return cached;
}

/** Test helper: forget the memoized environment. */
export function resetEnvForTests(): void {
  cached = undefined;
}
