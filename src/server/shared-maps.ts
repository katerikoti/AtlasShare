import type { CountryCode } from "@/data/countries";
import { isCountryCode } from "@/data/countries";
import type { PrismaClient } from "@/generated/prisma/client";
import type { SharedMapRole } from "@/generated/prisma/enums";
import { getDb } from "@/server/db";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationTtlMs,
} from "@/server/invitations";
import { normalizeEmail } from "@/server/validation/shared-maps";

function validCountryCodes(codes: string[]): CountryCode[] {
  return [...new Set(codes)]
    .filter((code): code is CountryCode => isCountryCode(code))
    .sort();
}

export type SharedMapSummary = {
  id: string;
  name: string;
  description: string | null;
  role: SharedMapRole;
  memberCount: number;
  combinedCount: number;
  updatedAt: Date;
};

export type SharedMapMemberView = {
  id: string;
  name: string;
  role: SharedMapRole;
  isCurrentUser: boolean;
  count: number;
  countries: CountryCode[];
};

export type SharedMapView = {
  id: string;
  name: string;
  description: string | null;
  role: SharedMapRole;
  memberCount: number;
  combinedCount: number;
  combinedCountries: { code: CountryCode; count: number }[];
  members: SharedMapMemberView[];
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Create a map and its owner membership atomically. The owner must have a
 * membership row so every read and write can use one uniform access check.
 */
export async function createSharedMapForUser(
  input: {
    ownerId: string;
    name: string;
    description: string | null;
  },
  db: PrismaClient = getDb(),
): Promise<string> {
  return db.$transaction(async (transaction) => {
    const map = await transaction.sharedMap.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: input.ownerId,
      },
      select: { id: true },
    });

    await transaction.sharedMapMember.create({
      data: {
        mapId: map.id,
        userId: input.ownerId,
        role: "OWNER",
      },
    });

    return map.id;
  });
}

/**
 * List a user's maps with only the aggregate data needed by the cards:
 * member count and the number of distinct countries visited by any member.
 */
export async function getSharedMapsForUser(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<SharedMapSummary[]> {
  const memberships = await db.sharedMapMember.findMany({
    where: { userId },
    select: {
      role: true,
      map: {
        select: {
          id: true,
          name: true,
          description: true,
          updatedAt: true,
          members: { select: { userId: true } },
        },
      },
    },
  });

  const memberIds = [
    ...new Set(
      memberships.flatMap((membership) =>
        membership.map.members.map((member) => member.userId),
      ),
    ),
  ];

  const visits =
    memberIds.length > 0
      ? await db.visitedCountry.findMany({
          where: { userId: { in: memberIds } },
          select: { userId: true, countryCode: true },
        })
      : [];

  const codesByUser = new Map<string, string[]>();
  for (const visit of visits) {
    const codes = codesByUser.get(visit.userId) ?? [];
    codes.push(visit.countryCode);
    codesByUser.set(visit.userId, codes);
  }

  return memberships
    .map((membership) => {
      const map = membership.map;
      const codes = new Set<CountryCode>();

      for (const member of map.members) {
        for (const code of codesByUser.get(member.userId) ?? []) {
          if (isCountryCode(code)) codes.add(code);
        }
      }

      return {
        id: map.id,
        name: map.name,
        description: map.description,
        role: membership.role,
        memberCount: map.members.length,
        combinedCount: codes.size,
        updatedAt: map.updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

type MapViewRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: {
    id: string;
    role: SharedMapRole;
    joinedAt: Date;
    userId: string;
    user: {
      name: string;
      visits: { countryCode: string }[];
    };
  }[];
};

/**
 * Build the aggregate shared-map view.
 *
 * Only membership labels, names, country codes, and counts leave this
 * function. Email addresses, user ids, account metadata, notes, and visit
 * dates are never selected into the returned objects.
 */
export function buildSharedMapView(
  row: MapViewRow,
  currentUserId: string,
): SharedMapView {
  const members = row.members
    .map((member): SharedMapMemberView => {
      const countries = validCountryCodes(
        member.user.visits.map((visit) => visit.countryCode),
      );

      return {
        id: member.id,
        name: member.user.name,
        role: member.role,
        isCurrentUser: member.userId === currentUserId,
        count: countries.length,
        countries,
      };
    })
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "OWNER" ? -1 : 1;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });

  const counts = new Map<CountryCode, number>();
  for (const member of members) {
    for (const code of member.countries) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }

  const currentMember = members.find((member) => member.isCurrentUser);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    role: currentMember?.role ?? "MEMBER",
    memberCount: members.length,
    combinedCount: counts.size,
    combinedCountries: [...counts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    members,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getSharedMapView(
  mapId: string,
  userId: string,
  db: PrismaClient = getDb(),
): Promise<SharedMapView | null> {
  const row = await db.sharedMap.findFirst({
    where: {
      id: mapId,
      members: { some: { userId } },
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          id: true,
          role: true,
          joinedAt: true,
          userId: true,
          user: {
            select: {
              name: true,
              visits: { select: { countryCode: true } },
            },
          },
        },
      },
    },
  });

  if (!row) return null;
  return buildSharedMapView(row, userId);
}

export async function getPendingInvitationsForMap(
  mapId: string,
  ownerId: string,
  db: PrismaClient = getDb(),
  now: Date = new Date(),
): Promise<{ id: string; email: string; expiresAt: Date; createdAt: Date }[]> {
  return db.sharedMapInvitation.findMany({
    where: {
      mapId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
      map: { ownerId },
    },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export type CreateMapInvitationResult =
  | {
      status: "created";
      invitation: { id: string; email: string; expiresAt: Date };
      token: string;
    }
  | { status: "already-member" }
  | { status: "not-found" };

/**
 * Create or replace the pending invitation for one email.
 *
 * Previous pending invites for the same map/email are revoked in the same
 * transaction, so only one link can be used. The raw token is returned to the
 * caller for the email/copy link; only its hash is written.
 */
export async function createMapInvitation(
  input: { mapId: string; ownerId: string; email: string },
  db: PrismaClient = getDb(),
  now: Date = new Date(),
  token: string = generateInvitationToken(),
): Promise<CreateMapInvitationResult> {
  const email = normalizeEmail(input.email);
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(now.getTime() + invitationTtlMs);

  return db.$transaction(async (transaction) => {
    const map = await transaction.sharedMap.findFirst({
      where: { id: input.mapId, ownerId: input.ownerId },
      select: { id: true },
    });
    if (!map) return { status: "not-found" };

    const existingMember = await transaction.sharedMapMember.findFirst({
      where: {
        mapId: input.mapId,
        user: { email },
      },
      select: { id: true },
    });
    if (existingMember) return { status: "already-member" };

    await transaction.sharedMapInvitation.updateMany({
      where: {
        mapId: input.mapId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    const invitation = await transaction.sharedMapInvitation.create({
      data: {
        mapId: input.mapId,
        email,
        tokenHash,
        role: "MEMBER",
        invitedById: input.ownerId,
        expiresAt,
      },
      select: { id: true, email: true, expiresAt: true },
    });

    return { status: "created", invitation, token };
  });
}

export async function revokeMapInvitation(
  input: { mapId: string; invitationId: string; ownerId: string },
  db: PrismaClient = getDb(),
  now: Date = new Date(),
): Promise<number> {
  const result = await db.sharedMapInvitation.updateMany({
    where: {
      id: input.invitationId,
      mapId: input.mapId,
      acceptedAt: null,
      revokedAt: null,
      map: { ownerId: input.ownerId },
    },
    data: { revokedAt: now },
  });

  return result.count;
}

export async function removeMapMember(
  input: { mapId: string; membershipId: string; ownerId: string },
  db: PrismaClient = getDb(),
): Promise<number> {
  const result = await db.sharedMapMember.deleteMany({
    where: {
      id: input.membershipId,
      mapId: input.mapId,
      role: "MEMBER",
      map: { ownerId: input.ownerId },
    },
  });

  return result.count;
}

export async function leaveSharedMap(
  input: { mapId: string; userId: string },
  db: PrismaClient = getDb(),
): Promise<number> {
  const result = await db.sharedMapMember.deleteMany({
    where: {
      mapId: input.mapId,
      userId: input.userId,
      role: "MEMBER",
    },
  });

  return result.count;
}

export async function updateSharedMapForOwner(
  input: {
    mapId: string;
    ownerId: string;
    name: string;
    description: string | null;
  },
  db: PrismaClient = getDb(),
): Promise<number> {
  const result = await db.sharedMap.updateMany({
    where: { id: input.mapId, ownerId: input.ownerId },
    data: { name: input.name, description: input.description },
  });

  return result.count;
}

export async function deleteSharedMapForOwner(
  input: { mapId: string; ownerId: string },
  db: PrismaClient = getDb(),
): Promise<number> {
  const result = await db.sharedMap.deleteMany({
    where: { id: input.mapId, ownerId: input.ownerId },
  });

  return result.count;
}

export type InvitationPreview =
  | {
      status: "valid";
      mapName: string;
      expiresAt: Date;
    }
  | {
      status: "already-member";
      mapId: string;
      mapName: string;
    }
  | { status: "wrong-email" }
  | { status: "invalid" };

/**
 * Resolve an invitation for display without accepting it. The map name is only
 * returned after the token, state, expiry, and invited email all check out.
 */
export async function getInvitationPreview(
  token: string,
  viewer: { userId: string; email: string },
  db: PrismaClient = getDb(),
  now: Date = new Date(),
): Promise<InvitationPreview> {
  const invitation = await db.sharedMapInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    select: {
      mapId: true,
      email: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      map: { select: { name: true } },
    },
  });

  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt.getTime() <= now.getTime()
  ) {
    return { status: "invalid" };
  }

  if (invitation.email !== normalizeEmail(viewer.email)) {
    return { status: "wrong-email" };
  }

  const membership = await db.sharedMapMember.findUnique({
    where: {
      mapId_userId: {
        mapId: invitation.mapId,
        userId: viewer.userId,
      },
    },
    select: { id: true },
  });

  if (membership) {
    return {
      status: "already-member",
      mapId: invitation.mapId,
      mapName: invitation.map.name,
    };
  }

  return {
    status: "valid",
    mapName: invitation.map.name,
    expiresAt: invitation.expiresAt,
  };
}

export type AcceptInvitationResult =
  | { status: "accepted"; mapId: string; mapName: string }
  | { status: "wrong-email" }
  | { status: "invalid" };

/**
 * Accept an invitation in one transaction.
 *
 * The conditional updateMany is the single-use claim. If two requests race,
 * PostgreSQL re-checks the predicate on the locked row and only one update can
 * affect a row. Membership creation and the acceptance stamp commit together.
 */
export async function acceptMapInvitation(
  input: { token: string; userId: string; email: string },
  db: PrismaClient = getDb(),
  now: Date = new Date(),
): Promise<AcceptInvitationResult> {
  const tokenHash = hashInvitationToken(input.token);
  const email = normalizeEmail(input.email);

  return db.$transaction(async (transaction) => {
    const invitation = await transaction.sharedMapInvitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        mapId: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        map: { select: { name: true } },
      },
    });

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt.getTime() <= now.getTime()
    ) {
      return { status: "invalid" };
    }

    if (invitation.email !== email) {
      return { status: "wrong-email" };
    }

    const claimed = await transaction.sharedMapInvitation.updateMany({
      where: {
        id: invitation.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { acceptedAt: now },
    });

    if (claimed.count !== 1) {
      return { status: "invalid" };
    }

    await transaction.sharedMapMember.upsert({
      where: {
        mapId_userId: {
          mapId: invitation.mapId,
          userId: input.userId,
        },
      },
      create: {
        mapId: invitation.mapId,
        userId: input.userId,
        role: "MEMBER",
      },
      update: {},
    });

    return {
      status: "accepted",
      mapId: invitation.mapId,
      mapName: invitation.map.name,
    };
  });
}
