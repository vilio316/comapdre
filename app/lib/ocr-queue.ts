import { Queue, Worker, Job } from "bullmq";
import redis from "./redis";
import { processLocalImages, processLocalDocument, processOnlineImage, processOnlineDocument } from "@/app/api/ocr/ocrFunctions";
import { setCachedOcrResult } from "@/app/lib/ocr-cache";
import fs from "fs/promises";

const OCR_QUEUE = "ocr";

export interface OcrLocalFile {
  path: string;
  name: string;
  mimeType: string;
}

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
      const { type, files, imageUrl, documentKey, mimeType } = job.data as {
        type: "local" | "online";
        files?: OcrLocalFile[];
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

      if (type === "local" && files && files.length > 0) {
        const lastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
        let succeeded = false;
        try {
          const fileObjects = await Promise.all(
            files.map(async (f) => {
              const buffer = await fs.readFile(f.path);
              return new File([buffer], f.name, { type: f.mimeType });
            }),
          );
          const images = fileObjects.filter((f) => f.type.startsWith("image/"));
          const docs = fileObjects.filter((f) => !f.type.startsWith("image/"));
          const results: string[] = [];
          if (images.length > 0) {
            results.push(await processLocalImages(images));
          }
          for (const doc of docs) {
            results.push(await processLocalDocument(doc, doc.type));
          }
          succeeded = true;
          return results.join("\n\n");
        } finally {
          if (succeeded || lastAttempt) {
            await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
          }
        }
      }

      throw new Error(`Invalid job: type=${type}, files=${JSON.stringify(files)}, imageUrl=${imageUrl}`);
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
