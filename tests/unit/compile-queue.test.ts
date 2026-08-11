import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createMemRedis, type MemRedis } from "@/tests/helpers/mem-redis";

const { memHolder } = vi.hoisted(() => ({ memHolder: { mem: null as MemRedis | null } }));
const { bullmqHolder } = vi.hoisted(() => ({
  bullmqHolder: { processors: {} as Record<string, (job: unknown) => Promise<unknown>> },
}));

vi.mock("ioredis", () => ({
  default: function RedisMock() {
    if (!memHolder.mem) memHolder.mem = createMemRedis();
    return memHolder.mem;
  },
}));

vi.mock("bullmq", () => {
  class MockQueue {
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

vi.mock("@/lib/cloudflareHelper", () => ({
  getObjectSignedUrl: vi.fn(),
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
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";
import { startCompileWorker } from "@/app/lib/compile-queue";

const processor = () => bullmqHolder.processors["compile"]!;

const fakeJob = (data: unknown, attemptsMade = 0, attempts = 2) => ({
  data,
  attemptsMade,
  opts: { attempts },
  id: "job-1",
});

beforeAll(() => {
  startCompileWorker();
});

beforeEach(() => {
  memHolder.mem?.reset();
  vi.clearAllMocks();
});

describe("local files", () => {
  it("extracts text from local images and documents and builds a markdown doc", async () => {
    vi.mocked(processLocalImages).mockResolvedValue("image text");
    vi.mocked(processLocalDocument).mockResolvedValue("doc text");

    const result = await processor()(
      fakeJob({
        files: [
          { path: "/tmp/a.png", name: "a.png", mimeType: "image/png" },
          { path: "/tmp/b.pdf", name: "b.pdf", mimeType: "application/pdf" },
        ],
      }),
    );

    expect(processLocalImages).toHaveBeenCalledTimes(1);
    expect(processLocalDocument).toHaveBeenCalledWith(expect.any(File), "application/pdf");
    expect(result.sources).toEqual(["a.png", "b.pdf"]);
    expect(result.text).toContain("## 1. a.png");
    expect(result.text).toContain("## 2. b.pdf");
    expect(result.text).toContain("image text");
    expect(result.text).toContain("doc text");
    expect(fs.unlink).toHaveBeenCalledTimes(2);
  });

  it("does not delete temp files on a failed attempt until the last attempt", async () => {
    vi.mocked(processLocalDocument).mockRejectedValue(new Error("parse failed"));

    await expect(
      processor()(
        fakeJob({
          files: [{ path: "/tmp/b.pdf", name: "b.pdf", mimeType: "application/pdf" }],
        }),
      ),
    ).rejects.toThrow("parse failed");
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it("deletes temp files on the last failed attempt", async () => {
    vi.mocked(processLocalDocument).mockRejectedValue(new Error("parse failed"));

    await expect(
      processor()(
        fakeJob(
          {
            files: [{ path: "/tmp/b.pdf", name: "b.pdf", mimeType: "application/pdf" }],
          },
          1,
          2,
        ),
      ),
    ).rejects.toThrow("parse failed");
    expect(fs.unlink).toHaveBeenCalledTimes(1);
  });
});

describe("online keys", () => {
  it("resolves signed URLs and dispatches images vs documents", async () => {
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/x.png");
    vi.mocked(processOnlineImage).mockResolvedValue("image text");
    vi.mocked(processOnlineDocument).mockResolvedValue("doc text");

    await processor()(
      fakeJob({ documentKeys: ["photo.png", "notes.pdf"] }),
    );

    expect(getObjectSignedUrl).toHaveBeenNthCalledWith(1, "photo.png");
    expect(getObjectSignedUrl).toHaveBeenNthCalledWith(2, "notes.pdf");
    expect(processOnlineImage).toHaveBeenCalledWith("https://signed/x.png");
    expect(processOnlineDocument).toHaveBeenCalledWith("https://signed/x.png", "application/pdf");
  });

  it("throws for unsupported file extensions", async () => {
    await expect(
      processor()(fakeJob({ documentKeys: ["archive.xyz"] })),
    ).rejects.toThrow("Unsupported document: archive.xyz");
  });
});

describe("invalid jobs", () => {
  it("throws when no sources are provided", async () => {
    await expect(processor()(fakeJob({}))).rejects.toThrow("Invalid compile job");
  });
});
