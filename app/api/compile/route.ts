import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { createCompileJob } from "@/app/lib/job-manager";
import { resolveMime, MAX_FILES, MAX_TOTAL_BYTES } from "@/app/lib/mcq-utils";
import { getOrgContext, canCompile } from "@/app/lib/org-membership";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext(request.headers);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canCompile(ctx.role)) {
      return NextResponse.json(
        { error: "Only class representatives can compile documents" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);
    const keys = formData
      .getAll("keys")
      .map((k) => String(k))
      .filter((k) => k.trim().length > 0);

    const totalInputs = files.length + keys.length;
    if (totalInputs === 0) {
      return NextResponse.json(
        { error: "No documents provided" },
        { status: 400 },
      );
    }

    if (totalInputs > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many documents. Maximum of ${MAX_FILES}.` },
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

    const tempFiles = await Promise.all(
      files.map(async (file) => {
        const mimeType = resolveMime(file.name, file.type);
        const tempPath = path.join(
          os.tmpdir(),
          `compile-${Date.now()}-${file.name}`,
        );
        await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
        return { path: tempPath, name: file.name, mimeType };
      }),
    );

    const { id } = await createCompileJob(tempFiles, keys, ctx.organizationId);
    return NextResponse.json({ jobId: id });
  } catch (error) {
    console.error("Compilation submission failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compilation failed" },
      { status: 500 },
    );
  }
}