import "dotenv/config";

import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * Migrations and introspection use the direct (non-pooled) Neon connection.
 * The runtime client uses the pooled `DATABASE_URL` through a driver adapter
 * (see src/server/db.ts).
 *
 * The datasource is optional here so `prisma generate` works in CI/build
 * environments that have no database credentials. Migration commands use
 * DIRECT_URL when set, otherwise fall back to DATABASE_URL (useful for local
 * Postgres where both are the same). They fail clearly if neither is set.
 */
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
});
