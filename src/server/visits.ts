import { isCountryCode, type CountryCode } from "@/data/countries";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/server/db";

/**
 * Private visit data for one user.
 *
 * Every function here is scoped by `userId`; callers must derive that id from
 * the server session, never from client input. The optional client parameter
 * keeps the persistence layer directly testable against the test database.
 */
export async function getVisitedCountryCodes(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<CountryCode[]> {
  const visits = await db.visitedCountry.findMany({
    where: { userId },
    select: { countryCode: true },
    orderBy: { countryCode: "asc" },
  });

  // Filter at the read boundary as well as the action boundary. A row created
  // by an older/buggy client must never inflate the count or reach the map.
  return visits
    .map((visit) => visit.countryCode)
    .filter((code): code is CountryCode => isCountryCode(code));
}

export type SetVisitedCountryInput = {
  userId: string;
  countryCode: string;
  visited: boolean;
};

/**
 * Set a country to visited/unvisited.
 *
 * This is intentionally a set operation rather than a blind toggle: two
 * requests for the same desired state are idempotent and cannot leave duplicate
 * rows or flip the value an extra time. The dataset validation happens in the
 * Server Action before this function is called.
 */
export async function setVisitedCountryForUser(
  { userId, countryCode, visited }: SetVisitedCountryInput,
  db: PrismaClient = getDb(),
): Promise<void> {
  if (visited) {
    await db.visitedCountry.upsert({
      where: {
        userId_countryCode: {
          userId,
          countryCode,
        },
      },
      create: {
        userId,
        countryCode,
      },
      update: {},
    });
    return;
  }

  await db.visitedCountry.deleteMany({
    where: { userId, countryCode },
  });
}
