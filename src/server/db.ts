import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

import { getEnv } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma client singleton.
 *
 * The adapter is chosen from the connection string so local development and
 * tests can use a plain Postgres server while production uses Neon:
 *   - Neon (serverless, HTTP/WebSocket driver): hosts ending in `.neon.tech`
 *   - Everything else (local Homebrew Postgres, CI): `pg`
 *
 * The client is created lazily so importing server modules during `next build`
 * does not require a database connection or secrets.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const { DATABASE_URL, NODE_ENV } = getEnv();
  const host = new URL(DATABASE_URL).hostname;
  const isNeon = host.endsWith(".neon.tech");

  const adapter = isNeon
    ? new PrismaNeon({ connectionString: DATABASE_URL })
    : new PrismaPg({ connectionString: DATABASE_URL });

  return new PrismaClient({
    adapter,
    log:
      NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

export async function disconnectDb(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }
}
