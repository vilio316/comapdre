import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/cloudflareHelper";
import prisma from "@/lib/prisma";
import { getOrgContext } from "@/app/lib/org-membership";

function extType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOCX";
  if (ext === "jpg" || ext === "jpeg") return "JPEG";
  if (ext === "png") return "PNG";
  if (ext === "md" || ext === "txt") return ext.toUpperCase();
  return (ext ?? "FILE").toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext(request.headers);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawTags = formData.get("tags") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const tags = rawTags ? (JSON.parse(rawTags) as string[]) : undefined;
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${ctx.organizationId}/${file.name}`;

    await uploadToR2(
      buffer,
      key,
      file.type || "application/octet-stream",
      tags,
    );

    await prisma.document.create({
      data: {
        id: crypto.randomUUID(),
        key,
        name: file.name,
        type: extType(file.name),
        size: buffer.byteLength,
        tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
      },
    });

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
