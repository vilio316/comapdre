import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";
import { inviteLinkExpiresAt, inviteUrlFor } from "@/app/lib/invite-links";

const INVITE_ROLES = new Set(["owner", "admin", "class_rep"]);
const VALID_ROLES = new Set(["member", "admin", "class_rep"]);

export async function POST(
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
    if (!INVITE_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to invite members" },
        { status: 403 },
      );
    }

    let body: { role?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const role: "member" | "admin" | "class_rep" =
      typeof body.role === "string" && VALID_ROLES.has(body.role)
        ? (body.role as "member" | "admin" | "class_rep")
        : "member";

    const expiresAt = inviteLinkExpiresAt();

    const invitation = await prisma.invitation.create({
      data: {
        id: `inv_${crypto.randomUUID().replace(/-/g, "")}`,
        organizationId: id,
        email: "",
        role,
        status: "pending",
        expiresAt,
        inviterId: user.id,
      },
    });

    const origin = new URL(request.url).origin;

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt.toISOString(),
          createdAt: invitation.createdAt.toISOString(),
          inviteUrl: inviteUrlFor(origin, invitation.id),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invitation" },
      { status: 500 },
    );
  }
}

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

    const invitations = await prisma.invitation.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: "desc" },
    });

    const origin = new URL(request.url).origin;

    return NextResponse.json({
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
    console.error("Failed to list invitations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list invitations" },
      { status: 500 },
    );
  }
}