import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createMemRedis, type MemRedis } from "@/tests/helpers/mem-redis";

const { memHolder } = vi.hoisted(() => ({ memHolder: { mem: null as MemRedis | null } }));
const { bullmqHolder } = vi.hoisted(() => ({
  bullmqHolder: {
    processors: {} as Record<string, (job: unknown) => Promise<unknown>>,
    queues: [] as unknown[],
  },
}));

vi.mock("ioredis", () => ({
  default: function RedisMock() {
    if (!memHolder.mem) memHolder.mem = createMemRedis();
    return memHolder.mem;
  },
}));

vi.mock("bullmq", () => {
  class MockQueue {
    name: string;
    constructor(name: string, _opts?: unknown) {
      this.name = name;
      bullmqHolder.queues.push(this);
    }
    async add() {
      return { id: "test-job-id" };
    }
    async getJob() {
      return null;
    }
  }
  class MockWorker {
    constructor(name: string, processor: (job: unknown) => Promise<unknown>, _opts?: unknown) {
      bullmqHolder.processors[name] = processor;
    }
    on() {}
  }
  return { Queue: MockQueue, Worker: MockWorker, Job: class {} };
});

vi.mock("@/app/api/ocr/ocrFunctions", () => ({
  processLocalImages: vi.fn(),
  processLocalDocument: vi.fn(),
  processOnlineImage: vi.fn(),
  processOnlineDocument: vi.fn(),
}));

vi.mock("@/app/lib/ocr-cache", () => ({
  setCachedOcrResult: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(async () => Buffer.from("bytes")),
    unlink: vi.fn(async () => undefined),
  },
}));

import fs from "fs/promises";
import {
  processLocalImages,
  processLocalDocument,
  processOnlineImage,
  processOnlineDocument,
} from "@/app/api/ocr/ocrFunctions";
import { setCachedOcrResult } from "@/app/lib/ocr-cache";
import { startWorker } from "@/app/lib/ocr-queue";

const processor = () => bullmqHolder.processors["ocr"]!;

const fakeJob = (data: unknown, attemptsMade = 0, attempts = 2) => ({
  data,
  attemptsMade,
  opts: { attempts },
  id: "job-1",
});

beforeAll(() => {
  startWorker();
});

beforeEach(() => {
  memHolder.mem?.reset();
  vi.clearAllMocks();
});

describe("online jobs", () => {
  it("processes an online image and does not cache without a documentKey", async () => {
    vi.mocked(processOnlineImage).mockResolvedValue("extracted text");
    const result = await processor()(
      fakeJob({ type: "online", imageUrl: "https://cdn/x.png" }),
    );
    expect(processOnlineImage).toHaveBeenCalledWith("https://cdn/x.png");
    expect(processOnlineDocument).not.toHaveBeenCalled();
    expect(result).toBe("extracted text");
    expect(setCachedOcrResult).not.toHaveBeenCalled();
  });

  it("caches the result when a documentKey is provided", async () => {
    vi.mocked(processOnlineImage).mockResolvedValue("extracted text");
    const result = await processor()(
      fakeJob({ type: "online", imageUrl: "https://cdn/x.png", documentKey: "doc:123" }),
    );
    expect(setCachedOcrResult).toHaveBeenCalledWith("doc:123", "extracted text");
    expect(result).toBe("extracted text");
  });

  it("routes application mime types to processOnlineDocument", async () => {
    vi.mocked(processOnlineDocument).mockResolvedValue("pdf text");
    await processor()(
      fakeJob({
        type: "online",
        imageUrl: "https://cdn/doc.pdf",
        mimeType: "application/pdf",
      }),
    );
    expect(processOnlineDocument).toHaveBeenCalledWith("https://cdn/doc.pdf", "application/pdf");
    expect(processOnlineImage).not.toHaveBeenCalled();
  });
});

describe("local jobs", () => {
  it("reads files, dispatches images and documents, and joins results", async () => {
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("bytes"));
    vi.mocked(processLocalImages).mockResolvedValue("image text");
    vi.mocked(processLocalDocument).mockResolvedValue("doc text");

    const result = await processor()(
      fakeJob({
        type: "local",
        files: [
          { path: "/tmp/a.png", name: "a.png", mimeType: "image/png" },
          { path: "/tmp/b.pdf", name: "b.pdf", mimeType: "application/pdf" },
        ],
      }),
    );

    expect(result).toBe("image text\n\ndoc text");
    expect(processLocalImages).toHaveBeenCalledTimes(1);
    expect(processLocalDocument).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledTimes(2);
  });

  it("does not unlink temp files when a retry attempt fails", async () => {
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("bytes"));
    vi.mocked(processLocalImages).mockRejectedValue(new Error("gemini down"));

    await expect(
      processor()(
        fakeJob({
          type: "local",
          files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
        }),
      ),
    ).rejects.toThrow("gemini down");
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it("unlinks temp files on the last attempt even when it fails", async () => {
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("bytes"));
    vi.mocked(processLocalImages).mockRejectedValue(new Error("gemini down"));

    await expect(
      processor()(
        fakeJob(
          {
            type: "local",
            files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
          },
          1,
          2,
        ),
      ),
    ).rejects.toThrow("gemini down");
    expect(fs.unlink).toHaveBeenCalledTimes(1);
  });

  it("unlinks files even when file reading fails on the last attempt", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
    await expect(
      processor()(
        fakeJob(
          {
            type: "local",
            files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
          },
          1,
          2,
        ),
      ),
    ).rejects.toThrow("ENOENT");
    expect(fs.unlink).toHaveBeenCalledTimes(1);
  });
});

describe("invalid jobs", () => {
  it("throws for unknown job shapes", async () => {
    await expect(processor()(fakeJob({ type: "other" }))).rejects.toThrow("Invalid job");
  });
});
