import { NextRequest, NextResponse } from "next/server";
import { createLocalOcrJob } from "@/app/lib/job-manager";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempPath = path.join(os.tmpdir(), `ocr-${Date.now()}-${file.name}`);
    await writeFile(tempPath, buffer);

    const { id } = await createLocalOcrJob(tempPath);

    return NextResponse.json({ jobId: id });
  } catch (error) {
    console.error("OCR submission failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed" },
      { status: 500 },
    );
  }
}
