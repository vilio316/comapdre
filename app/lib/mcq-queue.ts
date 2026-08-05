import { Queue, Worker, Job } from "bullmq";
import redis from "./redis";
import { generateMcqs, type McqInputPart } from "@/app/lib/mcq-schema";
import { setMcqResult } from "@/app/lib/mcq-cache";
import { recordMcqHistory } from "@/app/lib/mcq-history";
import { resolveMime, extToMime, MAX_MCQS } from "@/app/lib/mcq-utils";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";
import fs from "fs/promises";

const MCQ_QUEUE = "mcq";

export const mcqQueue = new Queue(MCQ_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

let worker: Worker | null = null;

export interface McqLocalFile {
  path: string;
  name: string;
  mimeType: string;
}

interface McqJobData {
  type: "local" | "online";
  files?: McqLocalFile[];
  documentKeys?: string[];
  count: number;
  resultKey: string;
}

async function buildPartsFromFiles(files: File[]): Promise<McqInputPart[]> {
  const parts: McqInputPart[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = resolveMime(file.name, file.type);
    const isImage = mimeType.startsWith("image/");
    parts.push(
      isImage
        ? {
            type: "image" as const,
            data: buffer.toString("base64"),
            mime_type: mimeType,
          }
        : {
            type: "document" as const,
            data: buffer.toString("base64"),
            mime_type: mimeType,
          },
    );
  }
  return parts;
}

async function buildPartFromStoredKey(key: string): Promise<McqInputPart> {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = extToMime[ext];
  if (!mimeType) {
    throw new Error(`Unsupported document: ${key}`);
  }

  const url = await getObjectSignedUrl(key);

  if (mimeType.startsWith("image/")) {
    return { type: "image", uri: url };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${key}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    type: "document",
    data: buffer.toString("base64"),
    mime_type: mimeType,
  };
}

export function startMcqWorker() {
  if (worker) return;

  worker = new Worker(
    MCQ_QUEUE,
    async (job: Job) => {
      const data = job.data as McqJobData;
      const parts: McqInputPart[] = [];

      if (data.files && data.files.length > 0) {
        const lastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
        let filesRead = false;
        try {
          const files = await Promise.all(
            data.files.map(async (f) => {
              const buffer = await fs.readFile(f.path);
              return new File([buffer], f.name, { type: f.mimeType });
            }),
          );
          filesRead = true;
          parts.push(...(await buildPartsFromFiles(files)));
        } finally {
          if (filesRead || lastAttempt) {
            await Promise.all(
              data.files.map((f) => fs.unlink(f.path).catch(() => {})),
            );
          }
        }
      }

      if (data.documentKeys && data.documentKeys.length > 0) {
        parts.push(
          ...(await Promise.all(data.documentKeys.map(buildPartFromStoredKey))),
        );
      }

      if (parts.length === 0) {
        throw new Error(`Invalid MCQ job: ${JSON.stringify(data)}`);
      }

      const count = Math.min(Math.max(data.count || 20, 1), MAX_MCQS);
      const mcqSet = await generateMcqs(parts, count);
      const json = JSON.stringify(mcqSet);
      if (data.resultKey) {
        await setMcqResult(data.resultKey, json);
      }

      if (
        data.resultKey &&
        data.documentKeys &&
        data.documentKeys.length > 0 &&
        !(data.files && data.files.length > 0)
      ) {
        await recordMcqHistory({
          resultKey: data.resultKey,
          keys: data.documentKeys,
          createdAt: Date.now(),
        });
      }

      return { resultKey: data.resultKey, count, result: mcqSet };
    },
    {
      connection: redis,
      concurrency: 2,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`MCQ job ${job?.id} failed:`, err);
  });

  worker.on("completed", (job) => {
    console.log(`MCQ job ${job.id} completed`);
  });
}
