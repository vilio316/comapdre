import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/lib/job-manager", () => ({
  createCompileJob: vi.fn(),
  createPdfJob: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(async () => undefined),
  default: { writeFile: vi.fn(async () => undefined) },
}));

vi.mock("@/app/lib/org-membership", () => ({
  getOrgContext: vi.fn(),
  canCompile: vi.fn(),
}));

import { POST as compilePost } from "@/app/api/compile/route";
import { POST as pdfPost } from "@/app/api/compile/pdf/route";
import { createCompileJob, createPdfJob } from "@/app/lib/job-manager";
import { getOrgContext, canCompile } from "@/app/lib/org-membership";

function buildRequest(fields: Record<string, string | File | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      for (const item of v) fd.append(k, item);
    } else {
      fd.append(k, v);
    }
  }
  return { formData: () => Promise.resolve(fd) };
}

function pngFile(name = "a.png") {
  return new File([new Uint8Array(10)], name, { type: "image/png" });
}

const orgContext = {
  user: { id: "u1", name: "Alice", email: "a@b.c" },
  organizationId: "org-1",
  role: "class_rep",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOrgContext).mockResolvedValue(orgContext);
  vi.mocked(canCompile).mockReturnValue(true);
});

describe("POST /api/compile", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);
    const res = await compilePost(buildRequest({ keys: ["notes.pdf"] }));
    expect(res.status).toBe(401);
    expect(createCompileJob).not.toHaveBeenCalled();
  });

  it("returns 403 for members without compile permission", async () => {
    vi.mocked(canCompile).mockReturnValue(false);
    const res = await compilePost(buildRequest({ keys: ["notes.pdf"] }));
    expect(res.status).toBe(403);
    expect(createCompileJob).not.toHaveBeenCalled();
  });

  it("returns 400 when nothing is provided", async () => {
    const res = await compilePost(buildRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No documents provided" });
  });

  it("returns 400 when too many inputs are provided", async () => {
    const files = Array.from({ length: 11 }, (_, i) => pngFile(`f${i}.png`));
    const res = await compilePost(buildRequest({ files }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Too many documents");
  });

  it("returns 400 when the total byte size exceeds the limit", async () => {
    const big = new File([new Uint8Array(16 * 1024 * 1024)], "big.png", { type: "image/png" });
    const res = await compilePost(buildRequest({ files: [big] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("MB limit");
  });

  it("writes uploaded files and enqueues a compile job scoped to the org", async () => {
    vi.mocked(createCompileJob).mockResolvedValue({ id: "compile-job" });
    const res = await compilePost(
      buildRequest({ files: [pngFile("a.png")], keys: ["notes.pdf"] }),
    );
    expect(await res.json()).toEqual({ jobId: "compile-job" });
    expect(createCompileJob).toHaveBeenCalledTimes(1);
    const [tempFiles, keys, organizationId] = createCompileJob.mock.calls[0] as [unknown[], string[], string];
    expect(tempFiles).toHaveLength(1);
    expect(keys).toEqual(["notes.pdf"]);
    expect(organizationId).toBe("org-1");
  });

  it("returns 500 when queueing fails", async () => {
    vi.mocked(createCompileJob).mockRejectedValue(new Error("queue down"));
    const res = await compilePost(buildRequest({ keys: ["notes.pdf"] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "queue down" });
  });
});

describe("POST /api/compile/pdf", () => {
  function jsonRequest(body: unknown) {
    return { json: () => Promise.resolve(body) };
  }

  it("returns 403 for members without compile permission", async () => {
    vi.mocked(canCompile).mockReturnValue(false);
    const res = await pdfPost(jsonRequest({ text: "body", fileName: "x.pdf" }) as never);
    expect(res.status).toBe(403);
    expect(createPdfJob).not.toHaveBeenCalled();
  });

  it("enqueues a pdf job for valid text with org scoping", async () => {
    vi.mocked(createPdfJob).mockResolvedValue({ id: "pdf-job" });
    const res = await pdfPost(
      jsonRequest({ text: "# Title\n\nBody", fileName: "notes.pdf" }) as never,
    );
    expect(await res.json()).toEqual({ jobId: "pdf-job" });
    expect(createPdfJob).toHaveBeenCalledWith("# Title\n\nBody", "notes.pdf", "org-1", "u1");
  });

  it("trims the file name before enqueuing", async () => {
    vi.mocked(createPdfJob).mockResolvedValue({ id: "pdf-job" });
    await pdfPost(
      jsonRequest({ text: "body", fileName: "  notes.pdf  " }) as never,
    );
    expect(createPdfJob).toHaveBeenCalledWith("body", "notes.pdf", "org-1", "u1");
  });

  it("returns 400 for empty text", async () => {
    const res = await pdfPost(jsonRequest({ text: "", fileName: "x.pdf" }) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "No text provided to convert to PDF",
    });
  });

  it("returns 400 when the text exceeds the size limit", async () => {
    const big = "x".repeat(5 * 1024 * 1024 + 1);
    const res = await pdfPost(jsonRequest({ text: big, fileName: "x.pdf" }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("too large");
  });

  it("returns 500 when queueing fails", async () => {
    vi.mocked(createPdfJob).mockRejectedValue(new Error("boom"));
    const res = await pdfPost(jsonRequest({ text: "body", fileName: "x.pdf" }) as never);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "boom" });
  });
});
