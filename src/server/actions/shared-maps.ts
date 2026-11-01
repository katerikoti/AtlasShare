"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getEnv } from "@/config/env";
import { getMapAccess, isMapOwner } from "@/server/authorization";
import { buildInvitationUrl } from "@/server/invitations";
import {
  acceptMapInvitation,
  createMapInvitation,
  createSharedMapForUser,
  deleteSharedMapForOwner,
  leaveSharedMap,
  removeMapMember,
  revokeMapInvitation,
  updateSharedMapForOwner,
} from "@/server/shared-maps";
import { requireSession } from "@/server/session";
import {
  createSharedMapSchema,
  deleteSharedMapSchema,
  generateInviteSchema,
  invitationTokenSchema,
  leaveSharedMapSchema,
  removeMemberSchema,
  revokeInvitationSchema,
  updateSharedMapSchema,
} from "@/server/validation/shared-maps";
import type {
  InvitationActionState,
  SharedMapActionState,
} from "./types";

const mapNotFoundMessage = "That shared map was not found.";
const ownerOnlyMessage = "Only the map owner can do that.";
const genericErrorMessage =
  "Something went wrong. Check your connection and try again.";

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function logFailure(action: string, message: unknown) {
  console.error(`[shared-maps] ${action} failed`, {
    message: message instanceof Error ? message.message : "unknown error",
  });
}

async function getOwnerAccess(mapId: string, userId: string) {
  const access = await getMapAccess(mapId, userId);
  if (!access) return { error: mapNotFoundMessage } as const;
  if (!isMapOwner(access)) return { error: ownerOnlyMessage } as const;
  return { access } as const;
}

export async function createSharedMapAction(
  _previous: SharedMapActionState,
  formData: FormData,
): Promise<SharedMapActionState> {
  const session = await requireSession();
  const parsed = createSharedMapSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  let mapId: string;
  try {
    mapId = await createSharedMapForUser({
      ownerId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
    });
  } catch (error) {
    logFailure("create", error);
    return { status: "error", message: genericErrorMessage };
  }

  revalidatePath("/shared");
  redirect(`/shared/${mapId}`);
}

export async function updateSharedMapAction(
  _previous: SharedMapActionState,
  formData: FormData,
): Promise<SharedMapActionState> {
  const session = await requireSession();
  const parsed = updateSharedMapSchema.safeParse({
    mapId: formData.get("mapId"),
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const owner = await getOwnerAccess(parsed.data.mapId, session.user.id);
  if ("error" in owner) {
    return { status: "error", message: owner.error };
  }

  try {
    const count = await updateSharedMapForOwner({
      mapId: parsed.data.mapId,
      ownerId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
    });
    if (count !== 1) {
      return { status: "error", message: mapNotFoundMessage };
    }
  } catch (error) {
    logFailure("update", error);
    return { status: "error", message: genericErrorMessage };
  }

  revalidatePath("/shared");
  revalidatePath(`/shared/${parsed.data.mapId}`);
  return { status: "success", message: "Map details updated." };
}

export async function deleteSharedMapAction(
  _previous: SharedMapActionState,
  formData: FormData,
): Promise<SharedMapActionState> {
  const session = await requireSession();
  const parsed = deleteSharedMapSchema.safeParse({
    mapId: formData.get("mapId"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const owner = await getOwnerAccess(parsed.data.mapId, session.user.id);
  if ("error" in owner) {
    return { status: "error", message: owner.error };
  }

  try {
    const count = await deleteSharedMapForOwner({
      mapId: parsed.data.mapId,
      ownerId: session.user.id,
    });
    if (count !== 1) {
      return { status: "error", message: mapNotFoundMessage };
    }
  } catch (error) {
    logFailure("delete", error);
    return { status: "error", message: genericErrorMessage };
  }

  revalidatePath("/shared");
  redirect("/shared?deleted=1");
}

export async function generateInviteLinkAction(
  _previous: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const session = await requireSession();
  const parsed = generateInviteSchema.safeParse({
    mapId: formData.get("mapId"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const owner = await getOwnerAccess(parsed.data.mapId, session.user.id);
  if ("error" in owner) {
    return { status: "error", message: owner.error };
  }

  let result;
  try {
    result = await createMapInvitation({
      mapId: parsed.data.mapId,
      ownerId: session.user.id,
    });
  } catch (error) {
    logFailure("generate invite link", error);
    return { status: "error", message: genericErrorMessage };
  }

  if (result.status === "not-found") {
    return { status: "error", message: mapNotFoundMessage };
  }

  const env = getEnv();
  const inviteUrl = buildInvitationUrl(
    env.APP_URL ?? env.NEXT_PUBLIC_APP_URL!,
    result.token,
  );

  revalidatePath(`/shared/${parsed.data.mapId}`);

  return {
    status: "success",
    message:
      "Invite link generated. Copy it and send it to your friends — anyone with an account can join while it is valid.",
    inviteUrl,
    expiresAt: result.invitation.expiresAt.toISOString(),
  };
}

export async function revokeInvitationAction(
  _previous: SharedMapActionState,
  formData: FormData,
): Promise<SharedMapActionState> {
  const session = await requireSession();
  const parsed = revokeInvitationSchema.safeParse({
    mapId: formData.get("mapId"),
    invitationId: formData.get("invitationId"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const owner = await getOwnerAccess(parsed.data.mapId, session.user.id);
  if ("error" in owner) {
    return { status: "error", message: owner.error };
  }

  try {
    const count = await revokeMapInvitation({
      mapId: parsed.data.mapId,
      invitationId: parsed.data.invitationId,
      ownerId: session.user.id,
    });
    if (count !== 1) {
      return {
        status: "error",
        message: "That invite link is no longer active.",
      };
    }
  } catch (error) {
    logFailure("revoke invitation", error);
    return { status: "error", message: genericErrorMessage };
  }

  revalidatePath(`/shared/${parsed.data.mapId}`);
  return { status: "success", message: "Invite link revoked." };
}

export async function removeMemberAction(
  _previous: SharedMapActionState,
  formData: FormData,
): Promise<SharedMapActionState> {
  const session = await requireSession();
  const parsed = removeMemberSchema.safeParse({
    mapId: formData.get("mapId"),
    membershipId: formData.get("membershipId"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const owner = await getOwnerAccess(parsed.data.mapId, session.user.id);
  if ("error" in owner) {
    return { status: "error", message: owner.error };
  }

  try {
    const count = await removeMapMember({
      mapId: parsed.data.mapId,
      membershipId: parsed.data.membershipId,
      ownerId: session.user.id,
    });
    if (count !== 1) {
      return {
        status: "error",
        message: "That member could not be removed. Refresh and try again.",
      };
    }
  } catch (error) {
    logFailure("remove member", error);
    return { status: "error", message: genericErrorMessage };
  }

  revalidatePath("/shared");
  revalidatePath(`/shared/${parsed.data.mapId}`);
  return { status: "success", message: "Member removed." };
}

export async function leaveSharedMapAction(
  _previous: SharedMapActionState,
  formData: FormData,
): Promise<SharedMapActionState> {
  const session = await requireSession();
  const parsed = leaveSharedMapSchema.safeParse({
    mapId: formData.get("mapId"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const access = await getMapAccess(parsed.data.mapId, session.user.id);
  if (!access) {
    return { status: "error", message: mapNotFoundMessage };
  }
  if (isMapOwner(access)) {
    return {
      status: "error",
      message: "The owner cannot leave a map. Delete it instead.",
    };
  }

  try {
    const count = await leaveSharedMap({
      mapId: parsed.data.mapId,
      userId: session.user.id,
    });
    if (count !== 1) {
      return { status: "error", message: mapNotFoundMessage };
    }
  } catch (error) {
    logFailure("leave map", error);
    return { status: "error", message: genericErrorMessage };
  }

  revalidatePath("/shared");
  redirect("/shared?left=1");
}

export async function acceptInvitationAction(
  _previous: SharedMapActionState,
  formData: FormData,
): Promise<SharedMapActionState> {
  const session = await requireSession();
  const parsed = invitationTokenSchema.safeParse(formData.get("token"));

  if (!parsed.success) {
    return {
      status: "error",
      message: "This invitation is invalid or has expired.",
    };
  }

  let result;
  try {
    result = await acceptMapInvitation({
      token: parsed.data,
      userId: session.user.id,
    });
  } catch (error) {
    logFailure("accept invitation", error);
    return { status: "error", message: genericErrorMessage };
  }

  if (result.status === "invalid") {
    return {
      status: "error",
      message: "This invitation is invalid or has expired.",
    };
  }

  revalidatePath("/shared");
  revalidatePath(`/shared/${result.mapId}`);
  redirect(`/shared/${result.mapId}?joined=1`);
}
