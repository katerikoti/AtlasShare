import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  getMapAccess: vi.fn(),
  createSharedMapForUser: vi.fn(),
  updateSharedMapForOwner: vi.fn(),
  deleteSharedMapForOwner: vi.fn(),
  createMapInvitation: vi.fn(),
  revokeMapInvitation: vi.fn(),
  removeMapMember: vi.fn(),
  leaveSharedMap: vi.fn(),
  acceptMapInvitation: vi.fn(),
  sendInvitationEmail: vi.fn(),
}));

vi.mock("@/server/session", () => ({
  requireSession: async () => {
    const session = await mocks.getSession();
    if (!session) throw new Error("redirect:/sign-in");
    return session;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mocks.redirect(url),
}));

vi.mock("@/config/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://atlasshare.example" }),
}));

vi.mock("@/server/authorization", () => ({
  getMapAccess: mocks.getMapAccess,
  isMapOwner: (access: { role: string }) => access.role === "OWNER",
}));

vi.mock("@/server/shared-maps", () => ({
  createSharedMapForUser: mocks.createSharedMapForUser,
  updateSharedMapForOwner: mocks.updateSharedMapForOwner,
  deleteSharedMapForOwner: mocks.deleteSharedMapForOwner,
  createMapInvitation: mocks.createMapInvitation,
  revokeMapInvitation: mocks.revokeMapInvitation,
  removeMapMember: mocks.removeMapMember,
  leaveSharedMap: mocks.leaveSharedMap,
  acceptMapInvitation: mocks.acceptMapInvitation,
}));

vi.mock("@/server/email", () => ({
  sendInvitationEmail: mocks.sendInvitationEmail,
}));

import type { SharedMapActionState } from "./types";

const idle: SharedMapActionState = { status: "idle" };
const signedIn = {
  user: {
    id: "user_owner",
    name: "Owner",
    email: "owner@example.com",
  },
};
const ownerAccess = {
  map: {
    id: "map_1",
    name: "Test map",
    description: null,
    ownerId: "user_owner",
  },
  membershipId: "member_owner",
  role: "OWNER",
};
const memberAccess = {
  ...ownerAccess,
  membershipId: "member_other",
  role: "MEMBER",
};

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function validForm(action: string): FormData {
  switch (action) {
    case "create":
      return form({ name: "A shared map" });
    case "update":
      return form({ mapId: "map_1", name: "Renamed" });
    case "delete":
      return form({ mapId: "map_1", confirmation: "DELETE" });
    case "invite":
      return form({ mapId: "map_1", email: "friend@example.com" });
    case "revoke":
      return form({ mapId: "map_1", invitationId: "invite_1" });
    case "remove":
      return form({ mapId: "map_1", membershipId: "member_other" });
    case "leave":
      return form({ mapId: "map_1" });
    case "accept":
      return form({ token: "a".repeat(43) });
    default:
      throw new Error(`Unknown action ${action}`);
  }
}

beforeEach(() => {
  vi.resetModules();
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getSession.mockResolvedValue(signedIn);
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`redirect:${url}`);
  });
  mocks.getMapAccess.mockResolvedValue(ownerAccess);
  mocks.updateSharedMapForOwner.mockResolvedValue(1);
  mocks.deleteSharedMapForOwner.mockResolvedValue(1);
  mocks.revokeMapInvitation.mockResolvedValue(1);
  mocks.removeMapMember.mockResolvedValue(1);
  mocks.leaveSharedMap.mockResolvedValue(1);
  mocks.sendInvitationEmail.mockResolvedValue("sent");
  mocks.createMapInvitation.mockResolvedValue({
    status: "created",
    invitation: {
      id: "invite_1",
      email: "friend@example.com",
      expiresAt: new Date("2026-11-02T00:00:00.000Z"),
    },
    token: "test-invitation-token",
  });
  mocks.acceptMapInvitation.mockResolvedValue({
    status: "accepted",
    mapId: "map_1",
    mapName: "Test map",
  });
});

describe("shared-map actions without a session", () => {
  it("rejects every action before validation or database access", async () => {
    mocks.getSession.mockResolvedValue(null);
    const actions = await import("./shared-maps");
    const cases = [
      ["create", actions.createSharedMapAction],
      ["update", actions.updateSharedMapAction],
      ["delete", actions.deleteSharedMapAction],
      ["invite", actions.inviteToSharedMapAction],
      ["revoke", actions.revokeInvitationAction],
      ["remove", actions.removeMemberAction],
      ["leave", actions.leaveSharedMapAction],
      ["accept", actions.acceptInvitationAction],
    ] as const;

    for (const [name, action] of cases) {
      await expect(action(idle, validForm(name))).rejects.toThrow(
        "redirect:/sign-in",
      );
    }

    expect(mocks.createSharedMapForUser).not.toHaveBeenCalled();
    expect(mocks.updateSharedMapForOwner).not.toHaveBeenCalled();
    expect(mocks.deleteSharedMapForOwner).not.toHaveBeenCalled();
    expect(mocks.createMapInvitation).not.toHaveBeenCalled();
    expect(mocks.revokeMapInvitation).not.toHaveBeenCalled();
    expect(mocks.removeMapMember).not.toHaveBeenCalled();
    expect(mocks.leaveSharedMap).not.toHaveBeenCalled();
    expect(mocks.acceptMapInvitation).not.toHaveBeenCalled();
  });
});

describe("owner-only shared-map actions", () => {
  it("rejects a member from updating, deleting, inviting, revoking, or removing", async () => {
    mocks.getMapAccess.mockResolvedValue(memberAccess);
    const actions = await import("./shared-maps");
    const cases = [
      ["update", actions.updateSharedMapAction],
      ["delete", actions.deleteSharedMapAction],
      ["invite", actions.inviteToSharedMapAction],
      ["revoke", actions.revokeInvitationAction],
      ["remove", actions.removeMemberAction],
    ] as const;

    for (const [name, action] of cases) {
      await expect(action(idle, validForm(name))).resolves.toEqual({
        status: "error",
        message: "Only the map owner can do that.",
      });
    }

    expect(mocks.updateSharedMapForOwner).not.toHaveBeenCalled();
    expect(mocks.deleteSharedMapForOwner).not.toHaveBeenCalled();
    expect(mocks.createMapInvitation).not.toHaveBeenCalled();
    expect(mocks.revokeMapInvitation).not.toHaveBeenCalled();
    expect(mocks.removeMapMember).not.toHaveBeenCalled();
  });

  it("rejects a non-member with a generic not-found error", async () => {
    mocks.getMapAccess.mockResolvedValue(null);
    const actions = await import("./shared-maps");
    const cases = [
      ["update", actions.updateSharedMapAction],
      ["delete", actions.deleteSharedMapAction],
      ["invite", actions.inviteToSharedMapAction],
      ["revoke", actions.revokeInvitationAction],
      ["remove", actions.removeMemberAction],
      ["leave", actions.leaveSharedMapAction],
    ] as const;

    for (const [name, action] of cases) {
      await expect(action(idle, validForm(name))).resolves.toEqual({
        status: "error",
        message: "That shared map was not found.",
      });
    }

    expect(mocks.updateSharedMapForOwner).not.toHaveBeenCalled();
    expect(mocks.deleteSharedMapForOwner).not.toHaveBeenCalled();
    expect(mocks.createMapInvitation).not.toHaveBeenCalled();
    expect(mocks.revokeMapInvitation).not.toHaveBeenCalled();
    expect(mocks.removeMapMember).not.toHaveBeenCalled();
    expect(mocks.leaveSharedMap).not.toHaveBeenCalled();
  });

  it("stops the owner from leaving and points to deletion instead", async () => {
    const { leaveSharedMapAction } = await import("./shared-maps");

    await expect(
      leaveSharedMapAction(idle, validForm("leave")),
    ).resolves.toEqual({
      status: "error",
      message: "The owner cannot leave a map. Delete it instead.",
    });
    expect(mocks.leaveSharedMap).not.toHaveBeenCalled();
  });
});

describe("shared-map action validation and success paths", () => {
  it("creates a trimmed map and redirects to it", async () => {
    mocks.createSharedMapForUser.mockResolvedValue("map_1");
    const { createSharedMapAction } = await import("./shared-maps");

    await expect(
      createSharedMapAction(
        idle,
        form({ name: "  Nordics  ", description: "  Sea and snow  " }),
      ),
    ).rejects.toThrow("redirect:/shared/map_1");

    expect(mocks.createSharedMapForUser).toHaveBeenCalledWith({
      ownerId: "user_owner",
      name: "Nordics",
      description: "Sea and snow",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/shared");
  });

  it("rejects an empty map name without writing", async () => {
    const { createSharedMapAction } = await import("./shared-maps");

    await expect(
      createSharedMapAction(idle, form({ name: "   " })),
    ).resolves.toEqual({ status: "error", message: "Enter a map name." });
    expect(mocks.createSharedMapForUser).not.toHaveBeenCalled();
  });

  it("updates and deletes only after the owner check", async () => {
    const { updateSharedMapAction, deleteSharedMapAction } =
      await import("./shared-maps");

    await expect(
      updateSharedMapAction(
        idle,
        form({ mapId: "map_1", name: "Renamed", description: "Updated" }),
      ),
    ).resolves.toEqual({
      status: "success",
      message: "Map details updated.",
    });
    expect(mocks.updateSharedMapForOwner).toHaveBeenCalledWith({
      mapId: "map_1",
      ownerId: "user_owner",
      name: "Renamed",
      description: "Updated",
    });

    await expect(
      deleteSharedMapAction(idle, validForm("delete")),
    ).rejects.toThrow("redirect:/shared?deleted=1");
    expect(mocks.deleteSharedMapForOwner).toHaveBeenCalledWith({
      mapId: "map_1",
      ownerId: "user_owner",
    });
  });

  it("requires the exact delete confirmation", async () => {
    const { deleteSharedMapAction } = await import("./shared-maps");

    await expect(
      deleteSharedMapAction(
        idle,
        form({ mapId: "map_1", confirmation: "delete" }),
      ),
    ).resolves.toEqual({
      status: "error",
      message: "Type DELETE (in capitals) to confirm.",
    });
    expect(mocks.deleteSharedMapForOwner).not.toHaveBeenCalled();
  });

  it("returns a copyable link and sends the invitation email", async () => {
    const { inviteToSharedMapAction } = await import("./shared-maps");

    const state = await inviteToSharedMapAction(idle, validForm("invite"));

    expect(state).toMatchObject({
      status: "success",
      invitedEmail: "friend@example.com",
      inviteUrl: "https://atlasshare.example/invite/test-invitation-token",
      emailDelivery: "sent",
    });
    expect(state.message).toContain("Invitation emailed");
    expect(mocks.createMapInvitation).toHaveBeenCalledWith({
      mapId: "map_1",
      ownerId: "user_owner",
      email: "friend@example.com",
    });
    expect(mocks.sendInvitationEmail).toHaveBeenCalledWith({
      to: "friend@example.com",
      mapName: "Test map",
      inviteUrl: "https://atlasshare.example/invite/test-invitation-token",
      expiresInDays: 7,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/shared/map_1");
  });

  it("still returns the link when email delivery is unavailable", async () => {
    mocks.sendInvitationEmail.mockResolvedValue("skipped");
    const { inviteToSharedMapAction } = await import("./shared-maps");

    const state = await inviteToSharedMapAction(idle, validForm("invite"));

    expect(state.status).toBe("success");
    expect(state.emailDelivery).toBe("skipped");
    expect(state.message).toContain("Copy the link");
    expect(state.inviteUrl).toContain("/invite/test-invitation-token");
  });

  it("reports an existing member without sending another email", async () => {
    mocks.createMapInvitation.mockResolvedValue({ status: "already-member" });
    const { inviteToSharedMapAction } = await import("./shared-maps");

    await expect(
      inviteToSharedMapAction(idle, validForm("invite")),
    ).resolves.toEqual({
      status: "error",
      message: "That email address already belongs to a member of this map.",
    });
    expect(mocks.sendInvitationEmail).not.toHaveBeenCalled();
  });

  it("revokes and removes only when the data layer reports one change", async () => {
    const { revokeInvitationAction, removeMemberAction } =
      await import("./shared-maps");

    await expect(
      revokeInvitationAction(idle, validForm("revoke")),
    ).resolves.toEqual({ status: "success", message: "Invitation revoked." });
    await expect(
      removeMemberAction(idle, validForm("remove")),
    ).resolves.toEqual({ status: "success", message: "Member removed." });

    expect(mocks.revokeMapInvitation).toHaveBeenCalledWith({
      mapId: "map_1",
      invitationId: "invite_1",
      ownerId: "user_owner",
    });
    expect(mocks.removeMapMember).toHaveBeenCalledWith({
      mapId: "map_1",
      membershipId: "member_other",
      ownerId: "user_owner",
    });
  });

  it("lets a member leave and redirects to the list", async () => {
    mocks.getMapAccess.mockResolvedValue(memberAccess);
    const { leaveSharedMapAction } = await import("./shared-maps");

    await expect(
      leaveSharedMapAction(idle, validForm("leave")),
    ).rejects.toThrow("redirect:/shared?left=1");
    expect(mocks.leaveSharedMap).toHaveBeenCalledWith({
      mapId: "map_1",
      userId: "user_owner",
    });
  });
});

describe("invitation acceptance action", () => {
  it("rejects a malformed token before database access", async () => {
    const { acceptInvitationAction } = await import("./shared-maps");

    await expect(
      acceptInvitationAction(idle, form({ token: "too-short" })),
    ).resolves.toEqual({
      status: "error",
      message: "This invitation is invalid or has expired.",
    });
    expect(mocks.acceptMapInvitation).not.toHaveBeenCalled();
  });

  it("explains a wrong-email invitation without redirecting", async () => {
    mocks.acceptMapInvitation.mockResolvedValue({ status: "wrong-email" });
    const { acceptInvitationAction } = await import("./shared-maps");

    const state = await acceptInvitationAction(idle, validForm("accept"));

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/different email address/i);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("uses one generic message for used, expired, revoked, or invalid invites", async () => {
    mocks.acceptMapInvitation.mockResolvedValue({ status: "invalid" });
    const { acceptInvitationAction } = await import("./shared-maps");

    await expect(
      acceptInvitationAction(idle, validForm("accept")),
    ).resolves.toEqual({
      status: "error",
      message: "This invitation is invalid or has expired.",
    });
  });

  it("revalidates and redirects after acceptance", async () => {
    const { acceptInvitationAction } = await import("./shared-maps");

    await expect(
      acceptInvitationAction(idle, validForm("accept")),
    ).rejects.toThrow("redirect:/shared/map_1?joined=1");

    expect(mocks.acceptMapInvitation).toHaveBeenCalledWith({
      token: "a".repeat(43),
      userId: "user_owner",
      email: "owner@example.com",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/shared");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/shared/map_1");
  });
});
