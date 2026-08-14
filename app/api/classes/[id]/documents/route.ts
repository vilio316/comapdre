import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/require-auth";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t) => typeof t === "string")
      : [];
  } catch {
    return [];
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

    const documents = await prisma.document.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: "desc" },
    });

    const docs = documents.map((doc) => ({
      id: doc.key,
      name: doc.name,
      type: doc.type,
      size: formatBytes(doc.size),
      uploaded: doc.createdAt.toISOString().slice(0, 10),
      tags: parseTags(doc.tags),
    }));

    return NextResponse.json({ docs });
  } catch (error) {
    console.error("Failed to list class documents:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list documents",
      },
      { status: 500 },
    );
  }
}