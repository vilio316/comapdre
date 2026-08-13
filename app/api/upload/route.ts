import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/cloudflareHelper";
import { getSessionUser } from "@/app/lib/require-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
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

    await uploadToR2(buffer, file.name, file.type || "application/octet-stream", tags);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
