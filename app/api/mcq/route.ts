import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";
import {
  createLocalMcqJob,
  createOnlineMcqJob,
  getMcqResult,
} from "@/app/lib/job-manager";
import { mcqQueue } from "@/app/lib/mcq-queue";
import { resolveMime, MAX_FILES, MAX_TOTAL_BYTES, MAX_MCQS } from "@/app/lib/mcq-utils";

function buildMcqCacheKey(count: number, fileHashes: string[], keys: string[]): string {
  const content = [
    ...fileHashes.slice().sort(),
    ...keys.slice().sort(),
  ].join("|");
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 32);
  return `mcq:v1:${count}:${hash}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const count = Math.min(Math.max(Number(formData.get("count")) || 20, 1), MAX_MCQS);
    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);
    const keys = formData
      .getAll("keys")
      .map((k) => String(k))
      .filter((k) => k.trim().length > 0);

    const totalInputs = files.length + keys.length;
    if (totalInputs === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
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

    const buffers = await Promise.all(
      files.map(async (file) => Buffer.from(await file.arrayBuffer())),
    );
    const fileHashes = buffers.map((b) =>
      createHash("sha256").update(b).digest("hex"),
    );
    const resultKey = buildMcqCacheKey(count, fileHashes, keys);

    const cached = await getMcqResult(resultKey);
    if (cached) {
      return NextResponse.json({ cached: true, resultKey });
    }

    const activeJobs = await mcqQueue.getJobs(["active", "waiting", "delayed"]);
    const existing = activeJobs.find((j) => j.data.resultKey === resultKey);
    if (existing) {
      return NextResponse.json({ jobId: existing.id!, resultKey });
    }

    if (files.length > 0) {
      const mcqFiles = await Promise.all(
        files.map(async (file, i) => {
          const mimeType = resolveMime(file.name, file.type);
          const tempPath = path.join(os.tmpdir(), `mcq-${Date.now()}-${file.name}`);
          await writeFile(tempPath, buffers[i]);
          return { path: tempPath, name: file.name, mimeType };
        }),
      );

      const { id } = await createLocalMcqJob(mcqFiles, count, resultKey, keys);
      return NextResponse.json({ jobId: id, resultKey });
    }

    const { id } = await createOnlineMcqJob(keys, count, resultKey);
    return NextResponse.json({ jobId: id, resultKey });
  } catch (error) {
    console.error("MCQ submission failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed" },
      { status: 500 },
    );
  }
}
