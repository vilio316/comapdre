import { Queue, Worker, Job } from "bullmq";
import redis from "./redis";
import {
  processLocalImages,
  processLocalDocument,
  processOnlineImage,
  processOnlineDocument,
} from "@/app/api/ocr/ocrFunctions";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";
import { extToMime } from "@/app/lib/mcq-utils";
import fs from "fs/promises";

const COMPILE_QUEUE = "compile";

export const compileQueue = new Queue(COMPILE_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

let worker: Worker | null = null;

export interface CompileLocalFile {
  path: string;
  name: string;
  mimeType: string;
}

export interface CompileJobResult {
  text: string;
  sources: string[];
}

interface CompileJobData {
  files?: CompileLocalFile[];
  documentKeys?: string[];
}

interface SourceResult {
  name: string;
  text: string;
}

async function extractFromLocalFile(f: CompileLocalFile): Promise<SourceResult> {
  const buffer = await fs.readFile(f.path);
  const file = new File([buffer], f.name, { type: f.mimeType });
  const isImage = f.mimeType.startsWith("image/");
  const text = isImage
    ? await processLocalImages([file])
    : await processLocalDocument(file, f.mimeType);
  return { name: f.name, text };
}

async function extractFromOnlineKey(key: string): Promise<SourceResult> {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = extToMime[ext];
  if (!mimeType) {
    throw new Error(`Unsupported document: ${key}`);
  }

  const url = await getObjectSignedUrl(key);
  const text = mimeType.startsWith("image/")
    ? await processOnlineImage(url)
    : await processOnlineDocument(url, mimeType);
  return { name: key, text };
}

export function startCompileWorker() {
  if (worker) return;

  worker = new Worker(
    COMPILE_QUEUE,
    async (job: Job) => {
      const data = job.data as CompileJobData;
      const local = data.files ?? [];
      const keys = data.documentKeys ?? [];

      if (local.length === 0 && keys.length === 0) {
        throw new Error(`Invalid compile job: ${JSON.stringify(data)}`);
      }

      const sources: Promise<SourceResult>[] = [
        ...local.map(extractFromLocalFile),
        ...keys.map(extractFromOnlineKey),
      ];

      let results: SourceResult[];
      try {
        results = await Promise.all(sources);
      } finally {
        await Promise.all(local.map((f) => fs.unlink(f.path).catch(() => {})));
      }

      const text = results
        .map((r, i) => {
          const header = `${i + 1}. ${r.name}`;
          const body = r.text.trim() || "(No text extracted)";
          return `## ${header}\n\n${body}`;
        })
        .join("\n\n---\n\n");

      return {
        text,
        sources: results.map((r) => r.name),
      } satisfies CompileJobResult;
    },
    {
      connection: redis,
      concurrency: 2,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`Compile job ${job?.id} failed:`, err);
  });

  worker.on("completed", (job) => {
    console.log(`Compile job ${job.id} completed`);
  });
}
