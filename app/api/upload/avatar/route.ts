import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteObjectFromR2, uploadToR2 } from "@/lib/cloudflareHelper";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

function extForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPEG, PNG, or WEBP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 400 },
      );
    }

    const key = `avatars/${session.user.id}.${extForType(file.type)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadToR2(buffer, key, file.type);

    const oldKey =
      session.user.image?.startsWith("avatars/") ? session.user.image : null;
    if (oldKey && oldKey !== key) {
      await deleteObjectFromR2(oldKey).catch(() => {});
    }

    await auth.api.updateUser({
      body: { image: key },
      headers: request.headers,
    });

    return NextResponse.json({ success: true, image: key });
  } catch (error) {
    console.error("Avatar upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
