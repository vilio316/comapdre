import { NextRequest, NextResponse } from "next/server";
import { generateMcqs, type McqInputPart } from "@/app/lib/mcq-schema";

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

const extToMime: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
const MAX_MCQS = 80;

function resolveMime(file: File): string {
  const declared = file.type.toLowerCase();
  if (declared && SUPPORTED_MIME_TYPES.has(declared)) return declared;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fromExt = extToMime[ext];
  if (fromExt) return fromExt;
  throw new Error(`Unsupported file type: ${file.name}`);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const count = Math.min(Math.max(Number(formData.get("count")) || 20, 1), MAX_MCQS);
    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum of ${MAX_FILES} documents.` },
        { status: 400 },
      );
    }

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        {
          error: `Total file size exceeds the ${Math.round(MAX_TOTAL_BYTES / (1024 * 1024))} MB limit.`,
        },
        { status: 400 },
      );
    }

    const parts: McqInputPart[] = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = resolveMime(file);
        return {
          type: mimeType.startsWith("image/") ? ("image" as const) : ("document" as const),
          data: buffer.toString("base64"),
          mime_type: mimeType,
        };
      }),
    );

    const mcqSet = await generateMcqs(parts, count);

    return NextResponse.json(mcqSet);
  } catch (error) {
    console.error("MCQ generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MCQ generation failed" },
      { status: 500 },
    );
  }
}
