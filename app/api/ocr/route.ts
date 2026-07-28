import { NextRequest, NextResponse } from "next/server";
import { processLocalImage } from "./ocrFunctions";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const imageResult = await processLocalImage(file);

    return NextResponse.json({ result: imageResult });
  } catch (error) {
    console.error("OCR failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
