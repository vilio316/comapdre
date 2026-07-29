import { NextResponse, NextRequest } from "next/server";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";
import { createOnlineOcrJob, getCachedOcrResult } from "@/app/lib/job-manager";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    const cached = await getCachedOcrResult(decodedKey);
    if (cached) {
      return NextResponse.json({ cached: true, result: cached });
    }

    const url = await getObjectSignedUrl(decodedKey);

    const { id } = await createOnlineOcrJob(url, decodedKey);

    return NextResponse.json({ jobId: id });
  } catch (error) {
    console.error("Failed to queue document OCR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to queue document OCR",
        success: false,
      },
      { status: 500 },
    );
  }
}
