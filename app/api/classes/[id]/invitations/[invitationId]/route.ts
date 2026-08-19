import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";

const INVITE_ROLES = new Set(["owner", "admin", "class_rep"]);

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> },
) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, invitationId } = await params;

    const membership = await prisma.member.findFirst({
      where: { organizationId: id, userId: user.id },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this class" },
        { status: 403 },
      );
    }
    if (!INVITE_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to cancel invitations" },
        { status: 403 },
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.organizationId !== id) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "canceled" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel invitation" },
      { status: 500 },
    );
  }
}