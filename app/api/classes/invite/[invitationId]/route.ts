import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const { invitationId } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        inviter: { select: { name: true, email: true } },
      },
    });

    if (
      !invitation ||
      invitation.status !== "pending" ||
      invitation.expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "This invite link is no longer available. It may have expired or been cancelled." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
        organizationId: invitation.organization.id,
        organizationName: invitation.organization.name,
        organizationSlug: invitation.organization.slug,
        inviterName: invitation.inviter.name,
      },
    });
  } catch (error) {
    console.error("Failed to load invite link:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load invite link" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to join this class" },
        { status: 401 },
      );
    }

    const { invitationId } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (
      !invitation ||
      invitation.status !== "pending" ||
      invitation.expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "This invite link has expired or is no longer available" },
        { status: 404 },
      );
    }

    const existing = await prisma.member.findFirst({
      where: { organizationId: invitation.organizationId, userId: user.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You are already a member of this class" },
        { status: 409 },
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: invitation.organizationId },
    });
    if (!organization) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const member = await prisma.member.create({
      data: {
        id: `mem_${crypto.randomUUID().replace(/-/g, "")}`,
        userId: user.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

    return NextResponse.json({
      member: {
        id: member.id,
        role: member.role,
        organizationId: member.organizationId,
      },
      invitation: {
        id: invitation.id,
        status: invitation.status,
      },
    });
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept invitation" },
      { status: 500 },
    );
  }
}