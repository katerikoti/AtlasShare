import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import {
  getVisitedCountryCodes,
  setVisitedCountryForUser,
} from "./visits";

// Vitest does not load Next.js env files by itself. The local .env is developer
// configuration, not a committed fixture; the suite is skipped when a test
// database is not configured (for example in a fresh checkout).
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

function testDatabaseUrl(): string | undefined {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) return undefined;

  // Prisma's pg adapter accepts normal connection strings; remove the
  // Prisma-specific `schema` query parameter that psql/libpq rejects.
  const url = new URL(value);
  url.searchParams.delete("schema");
  return url.toString();
}

const connectionString = testDatabaseUrl();
const describeWithDatabase = connectionString ? describe : describe.skip;

describeWithDatabase("visited-country persistence", () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: connectionString ?? "" }),
  });

  const userA = {
    id: `test-visits-a-${randomUUID()}`,
    email: `visits-a-${randomUUID()}@example.test`,
    name: "Visit Test A",
  };
  const userB = {
    id: `test-visits-b-${randomUUID()}`,
    email: `visits-b-${randomUUID()}@example.test`,
    name: "Visit Test B",
  };

  beforeAll(async () => {
    await db.user.createMany({ data: [userA, userB] });
  });

  beforeEach(async () => {
    await db.visitedCountry.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    await db.$disconnect();
  });

  it("persists a visit and stays idempotent when set true repeatedly", async () => {
    await setVisitedCountryForUser(
      { userId: userA.id, countryCode: "SE", visited: true },
      db,
    );
    await setVisitedCountryForUser(
      { userId: userA.id, countryCode: "SE", visited: true },
      db,
    );

    expect(await getVisitedCountryCodes(userA.id, db)).toEqual(["SE"]);
    await expect(
      db.visitedCountry.count({
        where: { userId: userA.id, countryCode: "SE" },
      }),
    ).resolves.toBe(1);
  });

  it("removes a visit and stays idempotent when set false repeatedly", async () => {
    await setVisitedCountryForUser(
      { userId: userA.id, countryCode: "NO", visited: true },
      db,
    );
    await setVisitedCountryForUser(
      { userId: userA.id, countryCode: "NO", visited: false },
      db,
    );
    await setVisitedCountryForUser(
      { userId: userA.id, countryCode: "NO", visited: false },
      db,
    );

    expect(await getVisitedCountryCodes(userA.id, db)).toEqual([]);
  });

  it("keeps two users' visits isolated", async () => {
    await setVisitedCountryForUser(
      { userId: userA.id, countryCode: "SE", visited: true },
      db,
    );
    await setVisitedCountryForUser(
      { userId: userB.id, countryCode: "NO", visited: true },
      db,
    );

    expect(await getVisitedCountryCodes(userA.id, db)).toEqual(["SE"]);
    expect(await getVisitedCountryCodes(userB.id, db)).toEqual(["NO"]);

    // B removing their own visit must not touch A's row.
    await setVisitedCountryForUser(
      { userId: userB.id, countryCode: "SE", visited: false },
      db,
    );

    expect(await getVisitedCountryCodes(userA.id, db)).toEqual(["SE"]);
    expect(await getVisitedCountryCodes(userB.id, db)).toEqual(["NO"]);
  });
});
