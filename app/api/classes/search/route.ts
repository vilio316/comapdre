import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";

export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ classes: [] });
  }
  if (query.length > 100) {
    return NextResponse.json({ error: "Search query must be 100 characters or fewer" }, { status: 400 });
  }

  try {
    const myClassIds = (
      await prisma.classMember.findMany({ where: { userId: user.id }, select: { classId: true } })
    ).map((m) => m.classId);

    const classes = await prisma.class.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
            ],
          },
          ...(myClassIds.length ? [{ id: { notIn: myClassIds } }] : []),
        ],
      },
      include: {
        owner: { select: { name: true } },
        members: { select: { userId: true } },
      },
      orderBy: { name: "asc" },
      take: 20,
    });

    return NextResponse.json({
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        description: c.description,
        ownerName: c.owner.name,
        memberCount: c.members.length,
      })),
    });
  } catch (error) {
    console.error("Failed to search classes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search classes" },
      { status: 500 },
    );
  }
}
