import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const image = session?.user?.image;

    if (!session?.user || !image) {
      return NextResponse.json({ url: null });
    }

    if (image.startsWith("avatars/")) {
      const url = await getObjectSignedUrl(image);
      return NextResponse.json({ url });
    }

    return NextResponse.json({ url: image });
  } catch (error) {
    console.error("Failed to resolve avatar:", error);
    return NextResponse.json({ url: null });
  }
}
