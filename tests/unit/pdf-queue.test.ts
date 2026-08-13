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

vi.mock("@/lib/cloudflareHelper", () => ({
  uploadToR2: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    document: {
      create: vi.fn(),
    },
  },
}));

vi.mock("pdfkit", () => {
  class MockPDFDocument {
    on: ReturnType<typeof vi.fn>;
    moveDown: ReturnType<typeof vi.fn>;
    font: ReturnType<typeof vi.fn>;
    fontSize: ReturnType<typeof vi.fn>;
    fillColor: ReturnType<typeof vi.fn>;
    text: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    constructor() {
      this.on = vi.fn(function (this: MockPDFDocument, event: string, cb: () => void) {
        if (event === "data") cb(Buffer.from("pdf-bytes"));
        if (event === "end") cb();
        return this;
      });
      this.moveDown = vi.fn(() => this);
      this.font = vi.fn(() => this);
      this.fontSize = vi.fn(() => this);
      this.fillColor = vi.fn(() => this);
      this.text = vi.fn(() => this);
      this.end = vi.fn(() => undefined);
    }
  }
  return { default: MockPDFDocument };
});

import { uploadToR2 } from "@/lib/cloudflareHelper";
import prisma from "@/lib/prisma";
import { startPdfWorker } from "@/app/lib/pdf-queue";

const processor = () => bullmqHolder.processors["compile-pdf"]!;

const fakeJob = (data: unknown) => ({
  data,
  attemptsMade: 0,
  opts: { attempts: 2 },
  id: "job-1",
});

beforeAll(() => {
  startPdfWorker();
});

beforeEach(() => {
  memHolder.mem?.reset();
  vi.clearAllMocks();
  vi.mocked(uploadToR2).mockResolvedValue({} as never);
});

describe("pdf generation", () => {
  it("renders markdown text and uploads the buffer to R2", async () => {
    const result = await processor()(
      fakeJob({ text: "# Title\n\nHello world", fileName: "notes.pdf" }),
    );

    expect(uploadToR2).toHaveBeenCalledWith(
      Buffer.from("pdf-bytes"),
      "notes.pdf",
      "application/pdf",
      ["compiled"],
    );
    expect(result.doc.key).toBe("notes.pdf");
    expect(result.doc.name).toBe("notes.pdf");
    expect(result.doc.type).toBe("pdf");
    expect(result.doc.size).toBe(9);
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("prefixes the key with the organization and records the document", async () => {
    const result = await processor()(
      fakeJob({ text: "body", fileName: "notes.pdf", organizationId: "org-1", userId: "u1" }),
    );
    expect(uploadToR2).toHaveBeenCalledWith(
      Buffer.from("pdf-bytes"),
      "org-1/notes.pdf",
      "application/pdf",
      ["compiled"],
    );
    expect(result.doc.key).toBe("org-1/notes.pdf");
    expect(result.doc.name).toBe("notes.pdf");
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "org-1/notes.pdf",
        name: "notes.pdf",
        type: "PDF",
        size: 9,
        tags: '["compiled"]',
        organizationId: "org-1",
        userId: "u1",
      }),
    });
  });

  it("sanitizes unsafe characters in the output filename", async () => {
    const result = await processor()(
      fakeJob({ text: "body", fileName: "my/fi:le?.pdf" }),
    );
    expect(uploadToR2).toHaveBeenCalledWith(
      Buffer.from("pdf-bytes"),
      "myfile.pdf",
      "application/pdf",
      ["compiled"],
    );
    expect(result.doc.key).toBe("myfile.pdf");
  });

  it("uses a default name when the file name is empty", async () => {
    await processor()(fakeJob({ text: "body", fileName: "   " }));
    expect(uploadToR2).toHaveBeenCalledWith(
      expect.any(Buffer),
      "Compiled document.pdf",
      "application/pdf",
      ["compiled"],
    );
  });

  it("throws when no text is provided", async () => {
    await expect(
      processor()(fakeJob({ text: "", fileName: "empty.pdf" })),
    ).rejects.toThrow("No text provided for PDF generation");
  });

  it("throws when text is whitespace only", async () => {
    await expect(
      processor()(fakeJob({ text: "   \n  ", fileName: "empty.pdf" })),
    ).rejects.toThrow("No text provided for PDF generation");
  });

  it("throws when the data payload is missing text entirely", async () => {
    await expect(processor()(fakeJob({ fileName: "x.pdf" }))).rejects.toThrow(
      "No text provided for PDF generation",
    );
  });
});
