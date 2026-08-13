import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        email: user.email.toLowerCase(),
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      include: { organization: { select: { id: true, name: true, slug: true } } },
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
        class: {
          id: inv.organization.id,
          name: inv.organization.name,
          code: inv.organization.slug,
        },
      })),
    });
  } catch (error) {
    console.error("Failed to list my invitations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list invitations" },
      { status: 500 },
    );
  }
}