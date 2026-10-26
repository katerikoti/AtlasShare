import { notFound } from "next/navigation";

import type { SharedMapRole } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/server/db";

export type MapAccess = {
  map: {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
  };
  membershipId: string;
  role: SharedMapRole;
};

/**
 * The single authorization lookup for shared-map data.
 *
 * It returns null for non-members without revealing whether the map exists.
 * Callers must derive `userId` from the server session, never from the client.
 * Read pages use `requireMapAccess` (404); Server Actions translate null into a
 * generic error response.
 */
export async function getMapAccess(
  mapId: string,
  userId: string,
  db: PrismaClient = getDb(),
): Promise<MapAccess | null> {
  const membership = await db.sharedMapMember.findFirst({
    where: { mapId, userId },
    select: {
      id: true,
      role: true,
      map: {
        select: {
          id: true,
          name: true,
          description: true,
          ownerId: true,
        },
      },
    },
  });

  if (!membership) return null;

  return {
    map: membership.map,
    membershipId: membership.id,
    role: membership.role,
  };
}

/**
 * Page-level variant: non-members get the app's 404 page, not a 403 that would
 * confirm the map exists.
 */
export async function requireMapAccess(
  mapId: string,
  userId: string,
  db: PrismaClient = getDb(),
): Promise<MapAccess> {
  const access = await getMapAccess(mapId, userId, db);
  if (!access) notFound();
  return access;
}

export function isMapOwner(access: MapAccess): boolean {
  return access.role === "OWNER";
}
