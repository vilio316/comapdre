import { NextRequest, NextResponse } from "next/server";
import { deleteObjectFromR2, getObjectSignedUrl } from "@/lib/cloudflareHelper";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    const url = await getObjectSignedUrl(decodedKey);

    const ext = decodedKey.split(".").pop()?.toLowerCase() ?? "";
    const type = ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : ext === "jpg" || ext === "jpeg" ? "jpeg" : ext === "png" ? "png" : "other";

    return NextResponse.json({ url, name: decodedKey, type });
  } catch (error) {
    console.error("Failed to get document URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get document" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    await deleteObjectFromR2(decodedKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document" },
      { status: 500 },
    );
  }
}
