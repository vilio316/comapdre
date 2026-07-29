import { Queue, Worker, Job } from "bullmq";
import redis from "./redis";
import { processLocalImage, processOnlineImage } from "@/app/api/ocr/ocrFunctions";
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
      const { type, filePath, imageUrl } = job.data as {
        type: "local" | "online";
        filePath?: string;
        imageUrl?: string;
      };

      if (type === "online" && imageUrl) {
        return await processOnlineImage(imageUrl);
      }

      if (type === "local" && filePath) {
        try {
          const buffer = await fs.readFile(filePath);
          const file = new File([buffer], "upload", { type: "image/jpeg" });
          return await processLocalImage(file);
        } finally {
          await fs.unlink(filePath).catch(() => {});
        }
      }

      throw new Error(`Invalid job: type=${type}, filePath=${filePath}, imageUrl=${imageUrl}`);
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
