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

vi.mock("@/app/lib/mcq-schema", () => ({
  generateMcqs: vi.fn(),
}));

vi.mock("@/app/lib/mcq-cache", () => ({
  setMcqResult: vi.fn(),
}));

vi.mock("@/app/lib/mcq-history", () => ({
  recordMcqHistory: vi.fn(),
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

import { generateMcqs } from "@/app/lib/mcq-schema";
import { setMcqResult } from "@/app/lib/mcq-cache";
import { recordMcqHistory } from "@/app/lib/mcq-history";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";
import { startMcqWorker } from "@/app/lib/mcq-queue";
import { MAX_MCQS } from "@/app/lib/mcq-utils";
import fs from "fs/promises";

const processor = () => bullmqHolder.processors["mcq"]!;

const fakeJob = (data: unknown, attemptsMade = 0, attempts = 2) => ({
  data,
  attemptsMade,
  opts: { attempts },
  id: "job-1",
});

const mcqSet = { questions: [{ q: "q", options: ["a", "b", "c", "d"], answer: 0 }] };

beforeAll(() => {
  startMcqWorker();
});

beforeEach(() => {
  memHolder.mem?.reset();
  vi.clearAllMocks();
  vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("bytes"));
  vi.mocked(fs.unlink).mockResolvedValue(undefined);
  vi.mocked(generateMcqs).mockResolvedValue(mcqSet);
});

describe("online jobs (stored document keys)", () => {
  it("generates mcqs from stored keys, caches the result, and records history", async () => {
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.pdf");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    );

    const result = await processor()(
      fakeJob({
        type: "online",
        documentKeys: ["notes.pdf"],
        count: 5,
        resultKey: "mcq:v1:5:abc",
      }),
    );

    expect(generateMcqs).toHaveBeenCalledWith(
      [{ type: "document", data: expect.any(String), mime_type: "application/pdf" }],
      5,
    );
    expect(setMcqResult).toHaveBeenCalledWith("mcq:v1:5:abc", JSON.stringify(mcqSet));
    expect(recordMcqHistory).toHaveBeenCalledWith({
      resultKey: "mcq:v1:5:abc",
      keys: ["notes.pdf"],
      createdAt: expect.any(Number),
    });
    expect(result.resultKey).toBe("mcq:v1:5:abc");
    expect(result.count).toBe(5);
  });

  it("builds image parts from stored keys using a uri", async () => {
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/diagram.png");
    await processor()(
      fakeJob({
        type: "online",
        documentKeys: ["diagram.png"],
        count: 3,
        resultKey: "mcq:v1:3:img",
      }),
    );

    expect(generateMcqs).toHaveBeenCalledWith(
      [{ type: "image", uri: "https://signed/diagram.png" }],
      3,
    );
  });

  it("throws for unsupported stored-key extensions", async () => {
    await expect(
      processor()(
        fakeJob({
          type: "online",
          documentKeys: ["archive.xyz"],
          count: 3,
          resultKey: "k",
        }),
      ),
    ).rejects.toThrow("Unsupported document: archive.xyz");
  });

  it("throws when the signed-url fetch fails", async () => {
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.pdf");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(
      processor()(
        fakeJob({
          type: "online",
          documentKeys: ["notes.pdf"],
          count: 3,
          resultKey: "k",
        }),
      ),
    ).rejects.toThrow("Failed to fetch document: notes.pdf");
  });
});

describe("local jobs (uploaded files)", () => {
  it("reads files and generates mcqs from them", async () => {
    const result = await processor()(
      fakeJob({
        type: "local",
        files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
        count: 10,
        resultKey: "mcq:v1:10:local",
      }),
    );

    expect(generateMcqs).toHaveBeenCalledTimes(1);
    const parts = generateMcqs.mock.calls[0][0] as unknown[];
    expect(parts).toHaveLength(1);
    expect((parts[0] as { type: string }).type).toBe("image");
    expect(setMcqResult).toHaveBeenCalledWith("mcq:v1:10:local", JSON.stringify(mcqSet));
    expect(result.count).toBe(10);
  });

  it("records history for local jobs, including uploaded file names", async () => {
    await processor()(
      fakeJob({
        type: "local",
        files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
        documentKeys: ["a.png"],
        count: 10,
        resultKey: "mcq:v1:10:local",
      }),
    );
    expect(recordMcqHistory).toHaveBeenCalledWith({
      resultKey: "mcq:v1:10:local",
      keys: ["a.png"],
      createdAt: expect.any(Number),
    });
  });

  it("does not record history for local jobs without document keys", async () => {
    await processor()(
      fakeJob({
        type: "local",
        files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
        count: 10,
        resultKey: "mcq:v1:10:local",
      }),
    );
    expect(recordMcqHistory).not.toHaveBeenCalled();
  });

  it("clamps the requested count to MAX_MCQS", async () => {
    await processor()(
      fakeJob({
        type: "local",
        files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
        count: 9999,
        resultKey: "mcq:v1:9999:clamp",
      }),
    );
    expect(generateMcqs.mock.calls[0][1]).toBe(MAX_MCQS);
  });

  it("defaults missing count to 20", async () => {
    await processor()(
      fakeJob({
        type: "local",
        files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
        resultKey: "mcq:v1:0:def",
      }),
    );
    expect(generateMcqs.mock.calls[0][1]).toBe(20);
  });

  it("unlinks temp files once they have been read, even if generation fails", async () => {
    vi.mocked(generateMcqs).mockRejectedValue(new Error("gen failed"));
    await expect(
      processor()(
        fakeJob({
          type: "local",
          files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
          count: 5,
          resultKey: "k",
        }),
      ),
    ).rejects.toThrow("gen failed");
    expect(fs.unlink).toHaveBeenCalledTimes(1);
  });

  it("does not unlink temp files when reading fails before the last attempt", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
    await expect(
      processor()(
        fakeJob({
          type: "local",
          files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
          count: 5,
          resultKey: "k",
        }),
      ),
    ).rejects.toThrow("ENOENT");
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it("deletes temp files on the last failed attempt", async () => {
    vi.mocked(generateMcqs).mockRejectedValue(new Error("gen failed"));
    await expect(
      processor()(
        fakeJob(
          {
            type: "local",
            files: [{ path: "/tmp/a.png", name: "a.png", mimeType: "image/png" }],
            count: 5,
            resultKey: "k",
          },
          1,
          2,
        ),
      ),
    ).rejects.toThrow("gen failed");
    expect(fs.unlink).toHaveBeenCalledTimes(1);
  });
});

describe("invalid jobs", () => {
  it("throws when no parts can be built", async () => {
    await expect(
      processor()(fakeJob({ type: "local", files: [], documentKeys: [], count: 5, resultKey: "k" })),
    ).rejects.toThrow("Invalid MCQ job");
  });
});
