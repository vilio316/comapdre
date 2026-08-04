import { ocrQueue } from "./ocr-queue";
import { mcqQueue, type McqLocalFile } from "./mcq-queue";
import { getCachedOcrResult, setCachedOcrResult } from "./ocr-cache";
import { getMcqResult, setMcqResult } from "./mcq-cache";

export { getCachedOcrResult, setCachedOcrResult };
export { getMcqResult, setMcqResult };

export async function createLocalOcrJob(filePaths: string[]): Promise<{ id: string }> {
  const job = await ocrQueue.add("ocr", { type: "local", filePaths });
  return { id: job.id! };
}

export async function createOnlineOcrJob(
  imageUrl: string,
  documentKey?: string,
  mimeType?: string,
): Promise<{ id: string }> {
  const job = await ocrQueue.add("ocr", { type: "online", imageUrl, documentKey, mimeType });
  return { id: job.id! };
}

export async function getJobStatus(jobId: string) {
  const job = await ocrQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();

  return {
    status: (
      state === "completed" ? "done"
      : state === "failed" ? "failed"
      : "processing"
    ) as "done" | "failed" | "processing",
    result: job.returnvalue as string | undefined,
    error: job.failedReason,
    createdAt: job.timestamp,
  };
}

export async function createLocalMcqJob(
  files: McqLocalFile[],
  count: number,
  resultKey: string,
  documentKeys: string[] = [],
): Promise<{ id: string }> {
  const job = await mcqQueue.add("mcq", { type: "local", files, documentKeys, count, resultKey });
  return { id: job.id! };
}

export async function createOnlineMcqJob(
  documentKeys: string[],
  count: number,
  resultKey: string,
): Promise<{ id: string }> {
  const job = await mcqQueue.add("mcq", { type: "online", documentKeys, count, resultKey });
  return { id: job.id! };
}

export async function getMcqJobStatus(jobId: string) {
  const job = await mcqQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();

  return {
    status: (
      state === "completed" ? "done"
      : state === "failed" ? "failed"
      : "processing"
    ) as "done" | "failed" | "processing",
    resultKey: job.data.resultKey as string | undefined,
    error: job.failedReason,
    createdAt: job.timestamp,
  };
}
