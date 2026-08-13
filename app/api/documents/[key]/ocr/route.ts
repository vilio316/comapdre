import { NextResponse, NextRequest } from "next/server";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";
import { createOnlineOcrJob, getCachedOcrResult } from "@/app/lib/job-manager";
import { ocrQueue } from "@/app/lib/ocr-queue";
import { sanitizeText } from "@/app/lib/text-sanitize";
import { getSessionUser } from "@/app/lib/require-auth";

const extToMime: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);
    const ext = decodedKey.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = extToMime[ext] || "image/jpeg";

    const cached = await getCachedOcrResult(decodedKey);
    if (cached) {
      return NextResponse.json({ cached: true, result: sanitizeText(cached) });
    }

    const activeJobs = await ocrQueue.getJobs(["active", "waiting", "delayed"]);
    const existing = activeJobs.find(
      (j) => j.data.documentKey === decodedKey,
    );
    if (existing) {
      return NextResponse.json({ jobId: existing.id! });
    }

    const url = await getObjectSignedUrl(decodedKey);

    const { id } = await createOnlineOcrJob(url, decodedKey, mimeType);

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
