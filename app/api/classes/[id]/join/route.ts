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
    const cls = await prisma.class.findUnique({
      where: { id },
      include: { members: { select: { userId: true } } },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (cls.members.some((m) => m.userId === user.id)) {
      return NextResponse.json({ error: "You are already a member of this class" }, { status: 409 });
    }

    await prisma.classMember.create({
      data: { userId: user.id, classId: cls.id, role: "member" },
    });

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        description: cls.description,
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
