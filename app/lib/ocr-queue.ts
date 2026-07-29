import { Queue, Worker, Job } from "bullmq";
import redis from "./redis";
import { processLocalImages, processOnlineImage, processOnlineDocument } from "@/app/api/ocr/ocrFunctions";
import { setCachedOcrResult } from "@/app/lib/ocr-cache";
import fs from "fs/promises";

const OCR_QUEUE = "ocr";

export const ocrQueue = new Queue(OCR_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

let worker: Worker | null = null;

export function startWorker() {
  if (worker) return;

  worker = new Worker(
    OCR_QUEUE,
    async (job: Job) => {
      const { type, filePaths, imageUrl, documentKey, mimeType } = job.data as {
        type: "local" | "online";
        filePaths?: string[];
        imageUrl?: string;
        documentKey?: string;
        mimeType?: string;
      };

      if (type === "online" && imageUrl) {
        const isDocument = mimeType && (mimeType.startsWith("application/"));
        const result = isDocument
          ? await processOnlineDocument(imageUrl, mimeType!)
          : await processOnlineImage(imageUrl);
        if (documentKey && result) {
          await setCachedOcrResult(documentKey, result);
        }
        return result;
      }

      if (type === "local" && filePaths && filePaths.length > 0) {
        try {
          const files = await Promise.all(
            filePaths.map(async (fp) => {
              const buffer = await fs.readFile(fp);
              return new File([buffer], "upload", { type: "image/jpeg" });
            }),
          );
          return await processLocalImages(files);
        } finally {
          await Promise.all(filePaths.map((fp) => fs.unlink(fp).catch(() => {})));
        }
      }

      throw new Error(`Invalid job: type=${type}, filePaths=${JSON.stringify(filePaths)}, imageUrl=${imageUrl}`);
    },
    {
      connection: redis,
      concurrency: 3,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`OCR job ${job?.id} failed:`, err);
  });

  worker.on("completed", (job) => {
    console.log(`OCR job ${job.id} completed`);
  });
}
