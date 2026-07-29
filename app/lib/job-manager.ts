import { ocrQueue } from "./ocr-queue";
import redis from "./redis";

const CACHE_PREFIX = "ocr:cache:";
const CACHE_TTL = 60 * 60 * 24 * 30;

export async function getCachedOcrResult(key: string): Promise<string | null> {
  return redis.get(`${CACHE_PREFIX}${key}`);
}

export async function setCachedOcrResult(key: string, result: string): Promise<void> {
  await redis.setex(`${CACHE_PREFIX}${key}`, CACHE_TTL, result);
}

export async function createLocalOcrJob(filePath: string): Promise<{ id: string }> {
  const job = await ocrQueue.add("ocr", { type: "local", filePath });
  return { id: job.id! };
}

export async function createOnlineOcrJob(
  imageUrl: string,
  documentKey?: string,
): Promise<{ id: string }> {
  const job = await ocrQueue.add("ocr", { type: "online", imageUrl, documentKey });
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
