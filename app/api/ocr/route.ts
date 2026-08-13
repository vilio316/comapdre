import { NextRequest, NextResponse } from "next/server";
import { createLocalOcrJob } from "@/app/lib/job-manager";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { resolveMime } from "@/app/lib/mcq-utils";
import { getOrgContext } from "@/app/lib/org-membership";

function sanitizeTempName(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);
  return cleaned || "file";
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext(request.headers);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const entries = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const localFiles = await Promise.all(
      entries.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = resolveMime(file.name, file.type);
        const tempPath = path.join(os.tmpdir(), `ocr-${Date.now()}-${sanitizeTempName(file.name)}`);
        await writeFile(tempPath, buffer);
        return { path: tempPath, name: file.name, mimeType };
      }),
    );

    const { id } = await createLocalOcrJob(localFiles);

    return NextResponse.json({ jobId: id });
  } catch (error) {
    console.error("OCR submission failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed" },
      { status: 500 },
    );
  }
}
