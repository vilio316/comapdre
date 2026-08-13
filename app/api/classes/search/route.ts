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
    const myOrgIds = (
      await prisma.member.findMany({ where: { userId: user.id }, select: { organizationId: true } })
    ).map((m) => m.organizationId);

    const organizations = await prisma.organization.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
            ],
          },
          ...(myOrgIds.length ? [{ id: { notIn: myOrgIds } }] : []),
        ],
      },
      include: {
        members: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
      take: 20,
    });

    return NextResponse.json({
      classes: organizations.map((o) => {
        const creator = o.members.find((m) => m.role === "class_rep");
        return {
          id: o.id,
          name: o.name,
          code: o.slug,
          description: o.description,
          classRepName: creator?.user.name ?? null,
          memberCount: o.members.length,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to search classes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search classes" },
      { status: 500 },
    );
  }
}
