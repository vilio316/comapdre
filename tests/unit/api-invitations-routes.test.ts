import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    member: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    invitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/app/lib/require-auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/invite-links", () => ({
  inviteLinkExpiresAt: vi.fn(() => new Date("2026-08-20T00:00:00.000Z")),
  inviteUrlFor: vi.fn((origin: string, id: string) => `${origin}/invite/${id}`),
}));

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";
import {
  POST as inviteCreate,
  GET as inviteList,
} from "@/app/api/classes/[id]/invitations/route";
import {
  GET as inviteGet,
  POST as inviteAccept,
} from "@/app/api/classes/invite/[invitationId]/route";
import { DELETE as cancelDelete } from "@/app/api/classes/[id]/invitations/[invitationId]/route";

const user = { id: "u1", email: "a@b.c", name: "Alice" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue(user as never);
});

const baseInvite = {
  id: "inv_abc123",
  organizationId: "c1",
  role: "member",
  status: "pending",
  email: "",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  createdAt: new Date("2026-08-19T00:00:00.000Z"),
  inviterId: "u1",
};

describe("POST /api/classes/[id]/invitations", () => {
  const endpoint = () =>
    inviteCreate(
      new Request("http://localhost/api/classes/c1/invitations", {
        method: "POST",
        body: JSON.stringify({ role: "member" }),
      }),
      { params: Promise.resolve({ id: "c1" }) },
    );

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await endpoint();
    expect(res.status).toBe(401);
  });

  it("returns 403 when the user is not a member", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
    const res = await endpoint();
    expect(res.status).toBe(403);
  });

  it("returns 403 when the member cannot invite", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "member",
    } as never);
    const res = await endpoint();
    expect(res.status).toBe(403);
    expect(prisma.invitation.create).not.toHaveBeenCalled();
  });

  it("creates a short-lived link invitation with the default role", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "class_rep",
    } as never);
    vi.mocked(prisma.invitation.create).mockResolvedValue({
      ...baseInvite,
      role: "member",
      id: "inv_created",
    } as never);

    const res = await endpoint();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.invitation.inviteUrl).toBe(
      "http://localhost/invite/inv_created",
    );
    expect(prisma.invitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.stringMatching(/^inv_[0-9a-f]{32}$/),
          organizationId: "c1",
          email: "",
          role: "member",
          status: "pending",
          expiresAt: new Date("2026-08-20T00:00:00.000Z"),
          inviterId: "u1",
        }),
      }),
    );
  });

  it("honors the requested role", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "admin",
    } as never);
    vi.mocked(prisma.invitation.create).mockResolvedValue({
      ...baseInvite,
      role: "class_rep",
      id: "inv_created",
    } as never);

    await inviteCreate(
      new Request("http://localhost/api/classes/c1/invitations", {
        method: "POST",
        body: JSON.stringify({ role: "class_rep" }),
      }),
      { params: Promise.resolve({ id: "c1" }) },
    );
    expect(prisma.invitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "class_rep" }),
      }),
    );
  });

  it("returns 400 for invalid JSON", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "admin",
    } as never);
    const res = await inviteCreate(
      new Request("http://localhost/api/classes/c1/invitations", {
        method: "POST",
        body: "{ not json",
      }),
      { params: Promise.resolve({ id: "c1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 on failure", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "admin",
    } as never);
    vi.mocked(prisma.invitation.create).mockRejectedValue(new Error("db down"));
    const res = await endpoint();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("db down");
  });
});

describe("GET /api/classes/[id]/invitations", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await inviteList(
      new Request("http://localhost/api/classes/c1/invitations"),
      { params: Promise.resolve({ id: "c1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns invitations with invite URLs", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "admin",
    } as never);
    vi.mocked(prisma.invitation.findMany).mockResolvedValue([
      baseInvite,
    ] as never);

    const res = await inviteList(
      new Request("http://localhost/api/classes/c1/invitations"),
      { params: Promise.resolve({ id: "c1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitations).toHaveLength(1);
    expect(body.invitations[0].inviteUrl).toBe(
      "http://localhost/invite/inv_abc123",
    );
  });
});

describe("GET /api/classes/invite/[invitationId]", () => {
  const endpoint = () =>
    inviteGet(
      new Request("http://localhost/api/classes/invite/inv_abc123"),
      { params: Promise.resolve({ invitationId: "inv_abc123" }) },
    );

  it("returns 404 when the invitation does not exist", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);
    const res = await endpoint();
    expect(res.status).toBe(404);
  });

  it("returns 404 when the invitation has expired", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...baseInvite,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      organization: { id: "c1", name: "Chem", slug: "CHEM1" },
      inviter: { name: "Alice", email: "a@b.c" },
    } as never);
    const res = await endpoint();
    expect(res.status).toBe(404);
  });

  it("returns 404 when the invitation is not pending", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...baseInvite,
      status: "accepted",
      organization: { id: "c1", name: "Chem", slug: "CHEM1" },
      inviter: { name: "Alice", email: "a@b.c" },
    } as never);
    const res = await endpoint();
    expect(res.status).toBe(404);
  });

  it("returns invitation details for anyone with the link", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...baseInvite,
      expiresAt,
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
      organization: { id: "c1", name: "Chem 101", slug: "CHEM1" },
      inviter: { name: "Alice", email: "a@b.c" },
    } as never);

    const res = await endpoint();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation).toEqual({
      id: "inv_abc123",
      role: "member",
      expiresAt: expiresAt.toISOString(),
      createdAt: "2026-08-19T00:00:00.000Z",
      organizationId: "c1",
      organizationName: "Chem 101",
      organizationSlug: "CHEM1",
      inviterName: "Alice",
    });
  });
});

describe("POST /api/classes/invite/[invitationId]", () => {
  const endpoint = () =>
    inviteAccept(
      new Request("http://localhost/api/classes/invite/inv_abc123", {
        method: "POST",
      }),
      { params: Promise.resolve({ invitationId: "inv_abc123" }) },
    );

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await endpoint();
    expect(res.status).toBe(401);
  });

  it("returns 404 when the invitation has expired", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...baseInvite,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    } as never);
    const res = await endpoint();
    expect(res.status).toBe(404);
  });

  it("returns 409 when the user is already a member", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(
      baseInvite as never,
    );
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m_existing",
    } as never);

    const res = await endpoint();
    expect(res.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("adds the member with the invite role and marks the invite accepted", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...baseInvite,
      role: "admin",
    } as never);
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: "c1",
      name: "Chem 101",
      slug: "CHEM1",
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: "mem_new", organizationId: "c1", role: "admin" },
      { id: "inv_abc123", status: "accepted" },
    ] as never);

    const res = await endpoint();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.member.role).toBe("admin");
    expect(body.invitation.status).toBe("accepted");
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("DELETE /api/classes/[id]/invitations/[invitationId]", () => {
  const endpoint = () =>
    cancelDelete(
      new Request("http://localhost/api/classes/c1/invitations/inv_abc123", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "c1", invitationId: "inv_abc123" }) },
    );

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await endpoint();
    expect(res.status).toBe(401);
  });

  it("returns 403 when the user is not a member", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
    const res = await endpoint();
    expect(res.status).toBe(403);
  });

  it("returns 403 when the member cannot cancel", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "member",
    } as never);
    const res = await endpoint();
    expect(res.status).toBe(403);
  });

  it("returns 404 when the invitation does not belong to the class", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "admin",
    } as never);
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      ...baseInvite,
      organizationId: "other",
    } as never);
    const res = await endpoint();
    expect(res.status).toBe(404);
  });

  it("cancels the invitation", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: "m1",
      role: "class_rep",
    } as never);
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(
      baseInvite as never,
    );
    vi.mocked(prisma.invitation.update).mockResolvedValue({
      ...baseInvite,
      status: "canceled",
    } as never);

    const res = await endpoint();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.invitation.update).toHaveBeenCalledWith({
      where: { id: "inv_abc123" },
      data: { status: "canceled" },
    });
  });
});