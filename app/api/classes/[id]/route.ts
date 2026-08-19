import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";
import { inviteUrlFor } from "@/app/lib/invite-links";

const INVITE_ROLES = new Set(["owner", "admin", "class_rep"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const membership = await prisma.member.findFirst({
      where: { organizationId: id, userId: user.id },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this class" },
        { status: 403 },
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!organization) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const creator = organization.members.find(
      (member) => member.role === "class_rep",
    );

    const invitations = INVITE_ROLES.has(membership.role)
      ? await prisma.invitation.findMany({
          where: { organizationId: id, status: "pending" },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const origin = new URL(request.url).origin;

    return NextResponse.json({
      class: {
        id: organization.id,
        name: organization.name,
        code: organization.slug,
        description: organization.description,
        role: membership.role,
        classRepName: creator?.user.name ?? null,
        memberCount: organization.members.length,
        createdAt: organization.createdAt.toISOString(),
      },
      canInvite: INVITE_ROLES.has(membership.role),
      members: organization.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      })),
      invitations: invitations.map((inv) => ({
        id: inv.id,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
        inviteUrl: inviteUrlFor(origin, inv.id),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch class detail:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch class" },
      { status: 500 },
    );
  }
}