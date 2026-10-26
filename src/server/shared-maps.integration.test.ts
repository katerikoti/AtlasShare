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
import { getMapAccess } from "./authorization";
import {
  acceptMapInvitation,
  createMapInvitation,
  createSharedMapForUser,
  getInvitationPreview,
  getPendingInvitationsForMap,
  getSharedMapView,
  getSharedMapsForUser,
  leaveSharedMap,
  removeMapMember,
  revokeMapInvitation,
  updateSharedMapForOwner,
} from "./shared-maps";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationTtlMs,
} from "./invitations";
import {
  getVisitedCountryCodes,
  setVisitedCountryForUser,
} from "./visits";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

function testDatabaseUrl(): string | undefined {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) return undefined;

  const url = new URL(value);
  url.searchParams.delete("schema");
  return url.toString();
}

const connectionString = testDatabaseUrl();
const describeWithDatabase = connectionString ? describe : describe.skip;

const userA = {
  id: `test-shared-a-${randomUUID()}`,
  email: `shared-a-${randomUUID()}@example.test`,
  name: "Shared Test A",
};
const userB = {
  id: `test-shared-b-${randomUUID()}`,
  email: `shared-b-${randomUUID()}@example.test`,
  name: "Shared Test B",
};
const userC = {
  id: `test-shared-c-${randomUUID()}`,
  email: `shared-c-${randomUUID()}@example.test`,
  name: "Shared Test C",
};

describeWithDatabase("shared maps and invitations", () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: connectionString ?? "" }),
  });

  async function createMap() {
    return createSharedMapForUser(
      {
        ownerId: userA.id,
        name: "Test shared map",
        description: "A map for the integration test.",
      },
      db,
    );
  }

  async function addVisit(userId: string, countryCode: string) {
    await setVisitedCountryForUser(
      { userId, countryCode, visited: true },
      db,
    );
  }

  async function invite(email: string, mapId: string, token?: string) {
    return createMapInvitation(
      { mapId, ownerId: userA.id, email },
      db,
      new Date(),
      token ?? generateInvitationToken(),
    );
  }

  beforeAll(async () => {
    await db.user.createMany({ data: [userA, userB, userC] });
  });

  beforeEach(async () => {
    await db.sharedMap.deleteMany({ where: { ownerId: userA.id } });
    await db.visitedCountry.deleteMany({
      where: { userId: { in: [userA.id, userB.id, userC.id] } },
    });
  });

  afterAll(async () => {
    await db.sharedMap.deleteMany({ where: { ownerId: userA.id } });
    await db.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, userC.id] } },
    });
    await db.$disconnect();
  });

  it("creates an owner membership atomically and scopes the list", async () => {
    const mapId = await createMap();

    const access = await getMapAccess(mapId, userA.id, db);
    expect(access?.role).toBe("OWNER");
    await expect(getMapAccess(mapId, userB.id, db)).resolves.toBeNull();

    const ownList = await getSharedMapsForUser(userA.id, db);
    expect(ownList).toHaveLength(1);
    expect(ownList[0]).toMatchObject({
      id: mapId,
      name: "Test shared map",
      role: "OWNER",
      memberCount: 1,
      combinedCount: 0,
    });
    await expect(getSharedMapsForUser(userB.id, db)).resolves.toEqual([]);
  });

  it("combines two members' country sets and keeps raw account data out", async () => {
    await addVisit(userA.id, "SE");
    await addVisit(userA.id, "NO");
    await addVisit(userB.id, "SE");
    await addVisit(userB.id, "FR");

    const mapId = await createMap();
    const invitation = await invite(userB.email, mapId);
    expect(invitation.status).toBe("created");
    if (invitation.status !== "created") return;

    await expect(
      acceptMapInvitation(
        { token: invitation.token, userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toMatchObject({ status: "accepted", mapId });

    const view = await getSharedMapView(mapId, userA.id, db);
    expect(view?.memberCount).toBe(2);
    expect(view?.combinedCount).toBe(3);
    expect(view?.combinedCountries).toEqual([
      { code: "FR", count: 1 },
      { code: "NO", count: 1 },
      { code: "SE", count: 2 },
    ]);
    expect(view?.members.find((member) => member.isCurrentUser)).toMatchObject({
      name: userA.name,
      role: "OWNER",
      count: 2,
    });
    expect(view?.members.find((member) => !member.isCurrentUser)).toMatchObject({
      name: userB.name,
      role: "MEMBER",
      count: 2,
    });

    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain(userA.email);
    expect(serialized).not.toContain(userB.email);
    expect(serialized).not.toContain("userId");
    expect(serialized).not.toContain("firstVisitedAt");
    expect(serialized).not.toContain("note");
    expect(Object.keys(view?.members[0] ?? {}).sort()).toEqual([
      "count",
      "countries",
      "id",
      "isCurrentUser",
      "name",
      "role",
    ]);
  });

  it("scopes pending invitations to the owner", async () => {
    const mapId = await createMap();
    const invitation = await invite(userB.email, mapId);
    expect(invitation.status).toBe("created");

    const ownerList = await getPendingInvitationsForMap(mapId, userA.id, db);
    expect(ownerList).toHaveLength(1);
    expect(ownerList[0].email).toBe(userB.email);

    const nonOwnerList = await getPendingInvitationsForMap(mapId, userB.id, db);
    expect(nonOwnerList).toEqual([]);
  });

  it("stores only a hashed single-use invitation and rejects the wrong email", async () => {
    const mapId = await createMap();
    const token = generateInvitationToken();
    const before = Date.now();
    const invitation = await invite(userB.email, mapId, token);

    expect(invitation.status).toBe("created");
    if (invitation.status !== "created") return;

    const row = await db.sharedMapInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
    });
    expect(row).not.toBeNull();
    expect(row?.tokenHash).toBe(hashInvitationToken(token));
    expect(row?.tokenHash).not.toBe(token);
    expect(row?.email).toBe(userB.email.toLowerCase());
    expect(row?.acceptedAt).toBeNull();
    expect(row?.revokedAt).toBeNull();
    expect(row?.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + invitationTtlMs,
    );

    await expect(
      acceptMapInvitation(
        { token, userId: userC.id, email: userC.email },
        db,
      ),
    ).resolves.toEqual({ status: "wrong-email" });
    await expect(
      getInvitationPreview(token, { userId: userC.id, email: userC.email }, db),
    ).resolves.toEqual({ status: "wrong-email" });

    const wrongView = await getSharedMapView(mapId, userC.id, db);
    expect(wrongView).toBeNull();

    await expect(
      acceptMapInvitation(
        { token, userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toMatchObject({ status: "accepted", mapId });

    const after = await db.sharedMapInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      select: { acceptedAt: true },
    });
    expect(after?.acceptedAt).not.toBeNull();

    await expect(
      acceptMapInvitation(
        { token, userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      getInvitationPreview(token, { userId: userB.id, email: userB.email }, db),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("allows only one of two simultaneous acceptances to claim a token", async () => {
    const mapId = await createMap();
    const invitation = await invite(userB.email, mapId);
    expect(invitation.status).toBe("created");
    if (invitation.status !== "created") return;

    const results = await Promise.all([
      acceptMapInvitation(
        { token: invitation.token, userId: userB.id, email: userB.email },
        db,
      ),
      acceptMapInvitation(
        { token: invitation.token, userId: userB.id, email: userB.email },
        db,
      ),
    ]);

    expect(results.filter((result) => result.status === "accepted")).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === "invalid")).toHaveLength(
      1,
    );
    await expect(
      db.sharedMapMember.count({ where: { mapId, userId: userB.id } }),
    ).resolves.toBe(1);
  });

  it("rejects expired and revoked invitations with the generic state", async () => {
    const mapId = await createMap();
    const expired = await invite(userB.email, mapId);
    expect(expired.status).toBe("created");
    if (expired.status !== "created") return;

    await db.sharedMapInvitation.update({
      where: { id: expired.invitation.id },
      data: { expiresAt: new Date(0) },
    });
    await expect(
      getInvitationPreview(
        expired.token,
        { userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      acceptMapInvitation(
        { token: expired.token, userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toEqual({ status: "invalid" });

    const revoked = await invite(userB.email, mapId);
    expect(revoked.status).toBe("created");
    if (revoked.status !== "created") return;

    await expect(
      revokeMapInvitation(
        {
          mapId,
          invitationId: revoked.invitation.id,
          ownerId: userA.id,
        },
        db,
      ),
    ).resolves.toBe(1);
    await expect(
      getInvitationPreview(
        revoked.token,
        { userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      acceptMapInvitation(
        { token: revoked.token, userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("revokes the previous pending link when inviting the same email again", async () => {
    const mapId = await createMap();
    const first = await invite(userB.email, mapId);
    const second = await invite(userB.email, mapId);
    expect(first.status).toBe("created");
    expect(second.status).toBe("created");
    if (first.status !== "created" || second.status !== "created") return;

    await expect(
      getInvitationPreview(
        first.token,
        { userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      getInvitationPreview(
        second.token,
        { userId: userB.id, email: userB.email },
        db,
      ),
    ).resolves.toMatchObject({ status: "valid", mapName: "Test shared map" });
  });

  it("removes a member's contribution without deleting their personal visits", async () => {
    await addVisit(userA.id, "SE");
    await addVisit(userB.id, "NO");
    const mapId = await createMap();
    const invitation = await invite(userB.email, mapId);
    expect(invitation.status).toBe("created");
    if (invitation.status !== "created") return;
    await acceptMapInvitation(
      { token: invitation.token, userId: userB.id, email: userB.email },
      db,
    );

    const before = await getSharedMapView(mapId, userA.id, db);
    const member = before?.members.find((entry) => !entry.isCurrentUser);
    expect(member).toBeDefined();

    await expect(
      removeMapMember(
        { mapId, membershipId: member?.id ?? "", ownerId: userA.id },
        db,
      ),
    ).resolves.toBe(1);
    await expect(getMapAccess(mapId, userB.id, db)).resolves.toBeNull();

    const after = await getSharedMapView(mapId, userA.id, db);
    expect(after?.memberCount).toBe(1);
    expect(after?.combinedCount).toBe(1);
    expect(after?.combinedCountries).toEqual([{ code: "SE", count: 1 }]);
    await expect(getVisitedCountryCodes(userB.id, db)).resolves.toEqual(["NO"]);
  });

  it("does not remove the owner's membership through member removal", async () => {
    const mapId = await createMap();
    const ownerAccess = await getMapAccess(mapId, userA.id, db);
    expect(ownerAccess).not.toBeNull();

    await expect(
      removeMapMember(
        {
          mapId,
          membershipId: ownerAccess?.membershipId ?? "",
          ownerId: userA.id,
        },
        db,
      ),
    ).resolves.toBe(0);
    await expect(getMapAccess(mapId, userA.id, db)).resolves.toMatchObject({
      role: "OWNER",
    });
  });

  it("lets a member leave and forbids the owner from leaving", async () => {
    const mapId = await createMap();
    const invitation = await invite(userB.email, mapId);
    expect(invitation.status).toBe("created");
    if (invitation.status !== "created") return;
    await acceptMapInvitation(
      { token: invitation.token, userId: userB.id, email: userB.email },
      db,
    );

    await expect(
      leaveSharedMap({ mapId, userId: userB.id }, db),
    ).resolves.toBe(1);
    await expect(getMapAccess(mapId, userB.id, db)).resolves.toBeNull();

    await expect(
      leaveSharedMap({ mapId, userId: userA.id }, db),
    ).resolves.toBe(0);
    await expect(getMapAccess(mapId, userA.id, db)).resolves.toMatchObject({
      role: "OWNER",
    });
  });

  it("lets only the owner update the map and revoke an invitation", async () => {
    const mapId = await createMap();
    const invitation = await invite(userB.email, mapId);
    expect(invitation.status).toBe("created");
    if (invitation.status !== "created") return;

    await expect(
      updateSharedMapForOwner(
        {
          mapId,
          ownerId: userB.id,
          name: "Hijacked",
          description: null,
        },
        db,
      ),
    ).resolves.toBe(0);
    await expect(
      updateSharedMapForOwner(
        {
          mapId,
          ownerId: userA.id,
          name: "Renamed",
          description: "New description",
        },
        db,
      ),
    ).resolves.toBe(1);

    const updated = await getSharedMapView(mapId, userA.id, db);
    expect(updated).toMatchObject({
      name: "Renamed",
      description: "New description",
    });

    await expect(
      revokeMapInvitation(
        {
          mapId,
          invitationId: invitation.invitation.id,
          ownerId: userB.id,
        },
        db,
      ),
    ).resolves.toBe(0);
    await expect(
      revokeMapInvitation(
        {
          mapId,
          invitationId: invitation.invitation.id,
          ownerId: userA.id,
        },
        db,
      ),
    ).resolves.toBe(1);
  });
});
