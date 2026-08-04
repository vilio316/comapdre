import { NextRequest, NextResponse } from "next/server";
import { generateMcqs, type McqInputPart } from "@/app/lib/mcq-schema";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const count = Math.min(Math.max(Number(formData.get("count")) || 5, 1), 15);
    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const parts: McqInputPart[] = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = file.type || "application/octet-stream";
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
