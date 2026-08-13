import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/app/lib/require-auth";
import { generateClassCode } from "@/app/lib/class-code";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.member.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            members: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const classes = memberships.map((m) => {
      const creator = m.organization.members.find(
        (member) => member.role === "class_rep",
      );
      return {
        id: m.organization.id,
        name: m.organization.name,
        code: m.organization.slug,
        description: m.organization.description,
        role: m.role,
        classRepName: creator?.user.name ?? null,
        memberCount: m.organization.members.length,
        createdAt: m.organization.createdAt.toISOString(),
      };
    });

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
  let user: { id: string } | null;
  try {
    user = await getSessionUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (error) {
    console.error("Failed to authenticate class creation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      { status: 500 },
    );
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
      : undefined;

  try {
    let code = generateClassCode();
    let attempts = 0;
    let organization: {
      id: string;
      name: string;
      slug: string;
      description?: string | null;
    } | null = null;
    while (attempts < 10) {
      try {
        organization = await auth.api.createOrganization({
          body: {
            name,
            slug: code,
            ...(description !== undefined ? { description } : {}),
          },
          headers: request.headers,
        });
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.toLowerCase().includes("slug") && attempts < 9) {
          code = generateClassCode();
          attempts++;
          continue;
        }
        return NextResponse.json({ error: message || "Failed to create class" }, { status: 400 });
      }
    }

    if (!organization) {
      return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
    }

    return NextResponse.json(
      {
        class: {
          id: organization.id,
          name: organization.name,
          code: organization.slug,
          description: organization.description ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create class:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create class" },
      { status: 500 },
    );
  }
}
