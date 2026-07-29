import { ocrQueue } from "./ocr-queue";
import { getCachedOcrResult, setCachedOcrResult } from "./ocr-cache";

export { getCachedOcrResult, setCachedOcrResult };

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
