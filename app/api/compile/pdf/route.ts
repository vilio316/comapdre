import { NextRequest, NextResponse } from "next/server";
import { createPdfJob } from "@/app/lib/job-manager";
import { getOrgContext, canCompile } from "@/app/lib/org-membership";

const MAX_PDF_TEXT_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext(request.headers);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canCompile(ctx.role)) {
      return NextResponse.json(
        { error: "Only class representatives can save compiled documents" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text : "";
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No text provided to convert to PDF" },
        { status: 400 },
      );
    }

    if (Buffer.byteLength(text, "utf-8") > MAX_PDF_TEXT_BYTES) {
      return NextResponse.json(
        { error: "Text is too large to render as a PDF." },
        { status: 400 },
      );
    }

    const { id } = await createPdfJob(text, fileName, ctx.organizationId, ctx.user.id);
    return NextResponse.json({ jobId: id });
  } catch (error) {
    console.error("PDF submission failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 },
    );
  }
}