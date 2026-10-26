import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { brand } from "./brand";
import { getEnv, resetEnvForTests } from "./env";

const KEYS = [
  "NODE_ENV",
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "DIRECT_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "BREVO_API_KEY",
  "EMAIL_FROM",
  "TEST_DATABASE_URL",
] as const;

const original = Object.fromEntries(
  KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof KEYS)[number], string | undefined>;

function setValidEnvironment(values: Partial<Record<(typeof KEYS)[number], string | undefined>> = {}) {
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/atlasshare";
  process.env.BETTER_AUTH_SECRET = "a".repeat(32);
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  delete process.env.DIRECT_URL;
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.TEST_DATABASE_URL;

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

beforeEach(() => {
  resetEnvForTests();
  setValidEnvironment();
});

afterEach(() => {
  const env = process.env as Record<string, string | undefined>;
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  resetEnvForTests();
});

describe("getEnv", () => {
  it("parses a minimal valid configuration", () => {
    const env = getEnv();
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.BETTER_AUTH_SECRET).toHaveLength(32);
    expect(env.EMAIL_FROM).toBe(`${brand.name} <hello@example.com>`);
    expect(env.BREVO_API_KEY).toBeUndefined();
  });

  it("fails with the variable name when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it("rejects a short auth secret", () => {
    process.env.BETTER_AUTH_SECRET = "too-short";
    expect(() => getEnv()).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("rejects a malformed app URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "not-a-url";
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("memoizes configuration for the process", () => {
    const first = getEnv();
    process.env.DATABASE_URL = "postgresql://changed";
    const second = getEnv();
    expect(second.DATABASE_URL).toBe(first.DATABASE_URL);
  });
});
