import { NextResponse, NextRequest } from "next/server";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";
import { processOnlineImage } from "@/app/api/ocr/ocrFunctions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    const url = await getObjectSignedUrl(decodedKey);

    const ext = decodedKey.split(".").pop()?.toLowerCase() ?? "";
    const type =
      ext === "pdf"
        ? "pdf"
        : ext === "docx"
          ? "docx"
          : ext === "jpg" || ext === "jpeg"
            ? "jpeg"
            : ext === "png"
              ? "png"
              : "other";

    const handledFileContent = await processOnlineImage(url);
    return NextResponse.json({
      output_text: handledFileContent,
      success: true,
    });
  } catch (error) {
    console.error("Failed to get document URL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get document",

        success: false,
      },
      { status: 500 },
    );
  }
}
