import { NextRequest, NextResponse } from "next/server";
import { deleteObjectFromR2, getObjectSignedUrl } from "@/lib/cloudflareHelper";
import prisma from "@/lib/prisma";
import { getOrgContext, canCompile } from "@/app/lib/org-membership";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const ctx = await getOrgContext(request.headers);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    const doc = await prisma.document.findFirst({
      where: { key: decodedKey, organizationId: ctx.organizationId },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const url = await getObjectSignedUrl(decodedKey);

    const type = doc.type.toLowerCase();
    const isText = type === "md" || type === "txt";

    const name = decodedKey.split("/").pop() ?? decodedKey;

    let text: string | undefined;
    if (isText) {
      const res = await fetch(url);
      if (res.ok) text = await res.text();
    }

    return NextResponse.json({ url, name, type, text });
  } catch (error) {
    console.error("Failed to get document URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get document" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const ctx = await getOrgContext(request.headers);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canCompile(ctx.role)) {
      return NextResponse.json(
        { error: "Only class representatives can delete documents" },
        { status: 403 },
      );
    }

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    const doc = await prisma.document.findFirst({
      where: { key: decodedKey, organizationId: ctx.organizationId },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await deleteObjectFromR2(decodedKey);
    await prisma.document.delete({ where: { id: doc.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document" },
      { status: 500 },
    );
  }
}
