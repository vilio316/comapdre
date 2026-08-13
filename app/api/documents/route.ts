import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrgContext } from "@/app/lib/org-membership";

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

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext(request.headers);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { organizationId: ctx.organizationId },
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
    console.error("Failed to list documents:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list documents",
      },
      { status: 500 },
    );
  }
}
