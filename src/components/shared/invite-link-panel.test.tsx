import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateInviteLinkAction: vi.fn(),
  revokeInvitationAction: vi.fn(),
}));

vi.mock("@/server/actions/shared-maps", () => ({
  generateInviteLinkAction: mocks.generateInviteLinkAction,
  revokeInvitationAction: mocks.revokeInvitationAction,
}));

import { InviteLinkPanel } from "./invite-link-panel";

const idle = { status: "idle" as const };

describe("InviteLinkPanel", () => {
  beforeEach(() => {
    cleanup();
    mocks.generateInviteLinkAction.mockReset();
    mocks.revokeInvitationAction.mockReset();
  });

  it("offers to generate a first link when none is active", () => {
    render(<InviteLinkPanel mapId="map_1" activeInvitation={null} />);

    expect(
      screen.getByRole("button", { name: "Generate invite link" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Replace with a new link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /revoke link/i }),
    ).not.toBeInTheDocument();
  });

  it("offers replace and revoke while a link is active, with its expiry", () => {
    render(
      <InviteLinkPanel
        mapId="map_1"
        activeInvitation={{ id: "invite_1", expiresAt: "2026-11-08T12:00:00Z" }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Replace with a new link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /revoke the invite link/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/expires on/i)).toBeInTheDocument();
    expect(screen.getByText(/November/i)).toBeInTheDocument();
  });

  it("requires only the map id to generate a link", async () => {
    mocks.generateInviteLinkAction.mockResolvedValue({
      status: "success",
      message: "Invite link generated.",
      inviteUrl: "https://atlasshare.example/invite/t0k3n",
      expiresAt: "2026-11-08T12:00:00.000Z",
    });
    mocks.revokeInvitationAction.mockResolvedValue(idle);

    render(
      <InviteLinkPanel
        mapId="map_1"
        activeInvitation={{ id: "invite_1", expiresAt: "2026-11-08T12:00:00Z" }}
      />,
    );

    fireEvent.submit(
      (screen.getByRole("button", { name: "Replace with a new link" }) as HTMLButtonElement).form ?? document.forms[0],
    );

    await waitFor(() => {
      expect(mocks.generateInviteLinkAction).toHaveBeenCalledTimes(1);
    });
    // FormData carries no email — the link is not addressed to anyone.
    const formData = mocks.generateInviteLinkAction.mock.calls[0][1] as FormData;
    expect(formData.get("mapId")).toBe("map_1");
    expect(formData.get("email")).toBeNull();
  });

  it("shows the copyable link and its validity after generating", async () => {
    mocks.generateInviteLinkAction.mockResolvedValue({
      status: "success",
      message: "Invite link generated.",
      inviteUrl: "https://atlasshare.example/invite/t0k3n",
      expiresAt: "2026-11-08T12:00:00.000Z",
    });
    mocks.revokeInvitationAction.mockResolvedValue(idle);

    render(<InviteLinkPanel mapId="map_1" activeInvitation={null} />);

    fireEvent.submit(
      (screen.getByRole("button", { name: "Generate invite link" }) as HTMLButtonElement).form ?? document.forms[0],
    );

    const linkbox = await screen.findByLabelText(/copyable invite link/i);
    expect(linkbox).toHaveValue("https://atlasshare.example/invite/t0k3n");
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.getByText(/November 8/i)).toBeInTheDocument();
    expect(
      screen.getByText(/everyone who opens the link while it is valid joins/i),
    ).toBeInTheDocument();
  });

  it("keeps the hash warning once a fresh link is shown", async () => {
    mocks.generateInviteLinkAction.mockResolvedValue({
      status: "success",
      message: "Invite link generated.",
      inviteUrl: "https://atlasshare.example/invite/t0k3n",
      expiresAt: "2026-11-08T12:00:00.000Z",
    });
    mocks.revokeInvitationAction.mockResolvedValue(idle);

    render(
      <InviteLinkPanel
        mapId="map_1"
        activeInvitation={{ id: "invite_1", expiresAt: "2026-11-08T12:00:00Z" }}
      />,
    );

    fireEvent.submit(
      (screen.getByRole("button", { name: "Replace with a new link" }) as HTMLButtonElement).form ?? document.forms[0],
    );

    await screen.findByLabelText(/copyable invite link/i);
    expect(
      screen.getByText(/only a hash of the link/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("An invite link is active right now."),
    ).not.toBeInTheDocument();
  });
});
