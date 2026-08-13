import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: { members: { select: { userId: true } } },
    });
    if (!organization) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (organization.members.some((m) => m.userId === user.id)) {
      return NextResponse.json({ error: "You are already a member of this class" }, { status: 409 });
    }

    await prisma.member.create({
      data: {
        id: `mem_${crypto.randomUUID().replace(/-/g, "")}`,
        userId: user.id,
        organizationId: organization.id,
        role: "member",
      },
    });

    return NextResponse.json({
      class: {
        id: organization.id,
        name: organization.name,
        code: organization.slug,
        description: organization.description,
        role: "member",
      },
    });
  } catch (error) {
    console.error("Failed to join class:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join class" },
      { status: 500 },
    );
  }
}
