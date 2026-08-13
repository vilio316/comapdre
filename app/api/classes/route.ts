import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";
import { generateClassCode } from "@/app/lib/class-code";

export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const memberships = await prisma.classMember.findMany({
      where: { userId: user.id },
      include: {
        class: {
          include: {
            owner: { select: { name: true } },
            members: { select: { userId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const classes = memberships.map((m) => ({
      id: m.class.id,
      name: m.class.name,
      code: m.class.code,
      description: m.class.description,
      role: m.role,
      ownerName: m.class.owner.name,
      memberCount: m.class.members.length,
      createdAt: m.class.createdAt.toISOString(),
    }));

    return NextResponse.json({ classes });
  } catch (error) {
    console.error("Failed to list classes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list classes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Class name is required" }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "Class name must be 100 characters or fewer" }, { status: 400 });
  }

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 500)
      : null;

  try {
    const cls = await prisma.$transaction(async (tx) => {
      let code = generateClassCode();
      let attempts = 0;
      while ((await tx.class.findUnique({ where: { code } })) && attempts < 10) {
        code = generateClassCode();
        attempts++;
      }

      const created = await tx.class.create({
        data: { name, code, description, ownerId: user.id },
      });

      await tx.classMember.create({
        data: { userId: user.id, classId: created.id, role: "owner" },
      });

      return created;
    });

    return NextResponse.json({ class: { id: cls.id, name: cls.name, code: cls.code, description: cls.description } }, { status: 201 });
  } catch (error) {
    console.error("Failed to create class:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create class" },
      { status: 500 },
    );
  }
}
