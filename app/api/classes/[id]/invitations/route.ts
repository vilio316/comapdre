import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/app/lib/require-auth";

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

    let body: { email?: unknown; role?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const role: "member" | "admin" | "class_rep" =
      typeof body.role === "string" &&
      ["member", "admin", "class_rep"].includes(body.role)
        ? (body.role as "member" | "admin" | "class_rep")
        : "member";

    try {
      const invitation = await auth.api.createInvitation({
        body: { email, role, organizationId: id },
        headers: request.headers,
      });

      return NextResponse.json(
        {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt.toISOString(),
            createdAt: new Date(invitation.createdAt).toISOString(),
          },
        },
        { status: 201 },
      );
    } catch (err) {
      const error = err as { status?: number; body?: { message?: string; code?: string } };
      const message =
        error?.body?.message ??
        (err instanceof Error ? err.message : "Failed to create invitation");
      const status = error?.status ?? 400;
      return NextResponse.json({ error: message }, { status });
    }
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

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
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