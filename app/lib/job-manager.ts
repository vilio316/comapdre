import { ocrQueue } from "./ocr-queue";

export async function createLocalOcrJob(filePath: string): Promise<{ id: string }> {
  const job = await ocrQueue.add("ocr", { type: "local", filePath });
  return { id: job.id! };
}

export async function createOnlineOcrJob(imageUrl: string): Promise<{ id: string }> {
  const job = await ocrQueue.add("ocr", { type: "online", imageUrl });
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
