import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/cloudflareHelper", () => ({
  getObjectSignedUrl: vi.fn(),
}));

vi.mock("@/app/lib/job-manager", () => ({
  createLocalOcrJob: vi.fn(),
  createOnlineOcrJob: vi.fn(),
  getJobStatus: vi.fn(),
  getCachedOcrResult: vi.fn(),
}));

vi.mock("@/app/lib/ocr-queue", () => ({
  ocrQueue: { getJobs: vi.fn() },
}));

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(async () => undefined),
  default: { writeFile: vi.fn(async () => undefined) },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/app/lib/org-membership", () => ({
  getOrgContext: vi.fn(),
  canCompile: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    document: {
      findFirst: vi.fn(),
    },
  },
}));

import { POST as ocrPost } from "@/app/api/ocr/route";
import { GET as ocrStatusGet } from "@/app/api/ocr/status/[jobId]/route";
import { POST as docOcrPost } from "@/app/api/documents/[key]/ocr/route";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";
import { createLocalOcrJob, createOnlineOcrJob, getJobStatus, getCachedOcrResult } from "@/app/lib/job-manager";
import { ocrQueue } from "@/app/lib/ocr-queue";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/app/lib/org-membership";
import prisma from "@/lib/prisma";

function fileFormData(files: { name: string; content: string; type: string }[]) {
  const fd = new FormData();
  for (const f of files) {
    fd.append("files", new File([f.content], f.name, { type: f.type }));
  }
  return fd;
}

function postRequest(fd: FormData): { formData: () => Promise<FormData> } {
  return { formData: () => Promise.resolve(fd) };
}

const orgContext = {
  user: { id: "u1", name: "Alice", email: "a@b.c" },
  organizationId: "org-1",
  role: "member",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "u1", email: "a@b.c" },
    session: {},
  } as never);
  vi.mocked(getOrgContext).mockResolvedValue(orgContext);
});

describe("POST /api/ocr", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);
    const res = await ocrPost(
      postRequest(fileFormData([{ name: "photo.png", content: "abc", type: "image/png" }])),
    );
    expect(res.status).toBe(401);
    expect(createLocalOcrJob).not.toHaveBeenCalled();
  });

  it("writes uploaded files to temp paths and enqueues a local OCR job", async () => {
    vi.mocked(createLocalOcrJob).mockResolvedValue({ id: "job-123" });

    const res = await ocrPost(
      postRequest(fileFormData([{ name: "photo.png", content: "abc", type: "image/png" }])),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ jobId: "job-123" });
    expect(createLocalOcrJob).toHaveBeenCalledTimes(1);
    const localFiles = createLocalOcrJob.mock.calls[0][0] as unknown[];
    expect(localFiles).toHaveLength(1);
    expect((localFiles[0] as { name: string }).name).toBe("photo.png");
    expect((localFiles[0] as { mimeType: string }).mimeType).toBe("image/png");
    expect((localFiles[0] as { path: string }).path).toContain("ocr-");
  });

  it("sanitizes unsafe characters from temp file names", async () => {
    vi.mocked(createLocalOcrJob).mockResolvedValue({ id: "job-123" });

    await ocrPost(
      postRequest(fileFormData([{ name: 'bad<>:name.png', content: "abc", type: "image/png" }])),
    );

    const localFiles = createLocalOcrJob.mock.calls[0][0] as { path: string }[];
    expect(localFiles[0].path).toContain("bad___name.png");
  });

  it("returns 400 when no files are provided", async () => {
    const res = await ocrPost(postRequest(new FormData()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No files provided" });
  });

  it("returns 400 when non-File entries are submitted", async () => {
    const fd = new FormData();
    fd.append("files", "not-a-file");
    const res = await ocrPost(postRequest(fd));
    expect(res.status).toBe(400);
  });

  it("returns 500 when job creation fails", async () => {
    vi.mocked(createLocalOcrJob).mockRejectedValue(new Error("queue down"));
    const res = await ocrPost(
      postRequest(fileFormData([{ name: "photo.png", content: "abc", type: "image/png" }])),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "queue down" });
  });
});

describe("GET /api/ocr/status/[jobId]", () => {
  it("returns 404 when the job does not exist", async () => {
    vi.mocked(getJobStatus).mockResolvedValue(null);
    const res = await ocrStatusGet(new Request("http://localhost/api/ocr/status/x"), {
      params: Promise.resolve({ jobId: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns job status and result for completed jobs", async () => {
    vi.mocked(getJobStatus).mockResolvedValue({
      status: "done",
      result: "extracted text",
      error: undefined,
      createdAt: 123,
    });
    const res = await ocrStatusGet(new Request("http://localhost/api/ocr/status/x"), {
      params: Promise.resolve({ jobId: "job-1" }),
    });
    expect(await res.json()).toEqual({
      status: "done",
      result: "extracted text",
      error: undefined,
    });
  });
});

describe("POST /api/documents/[key]/ocr", () => {
  const docRow = (overrides: Record<string, unknown> = {}) => ({
    id: "d1",
    key: "notes.pdf",
    name: "notes.pdf",
    type: "application/pdf",
    size: 100,
    tags: null,
    organizationId: "org-1",
    userId: "u1",
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(docRow() as never);
  });

  it("returns 401 when the user has no active organization", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);
    const res = await docOcrPost({ formData: () => Promise.resolve(new FormData()) }, {
      params: Promise.resolve({ key: "a.pdf" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the document is not in the active organization", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null);
    const res = await docOcrPost({ formData: () => Promise.resolve(new FormData()) }, {
      params: Promise.resolve({ key: "a.pdf" }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).success).toBe(false);
  });

  it("returns a cached sanitized result when present", async () => {
    vi.mocked(getCachedOcrResult).mockResolvedValue("raw $x$ math");
    const res = await docOcrPost({ formData: () => Promise.resolve(new FormData()) }, {
      params: Promise.resolve({ key: "a.pdf" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.cached).toBe(true);
    expect(body.result).not.toContain("$x$");
  });

  it("reuses an active job for the same document key", async () => {
    vi.mocked(getCachedOcrResult).mockResolvedValue(null);
    vi.mocked(ocrQueue.getJobs).mockResolvedValue([
      { id: "active-1", data: { documentKey: "notes.pdf" } },
    ] as never);

    const res = await docOcrPost({ formData: () => Promise.resolve(new FormData()) }, {
      params: Promise.resolve({ key: "notes.pdf" }),
    });
    expect(await res.json()).toEqual({ jobId: "active-1" });
    expect(createOnlineOcrJob).not.toHaveBeenCalled();
  });

  it("enqueues a new online OCR job for uncached documents", async () => {
    vi.mocked(getCachedOcrResult).mockResolvedValue(null);
    vi.mocked(ocrQueue.getJobs).mockResolvedValue([]);
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.pdf");
    vi.mocked(createOnlineOcrJob).mockResolvedValue({ id: "new-job" });

    const res = await docOcrPost({ formData: () => Promise.resolve(new FormData()) }, {
      params: Promise.resolve({ key: "notes.pdf" }),
    });
    expect(await res.json()).toEqual({ jobId: "new-job" });
    expect(getObjectSignedUrl).toHaveBeenCalledWith("notes.pdf");
    expect(createOnlineOcrJob).toHaveBeenCalledWith("https://signed/notes.pdf", "notes.pdf", "application/pdf");
  });

  it("treats unknown extensions as images", async () => {
    vi.mocked(getCachedOcrResult).mockResolvedValue(null);
    vi.mocked(ocrQueue.getJobs).mockResolvedValue([]);
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/scan");
    vi.mocked(createOnlineOcrJob).mockResolvedValue({ id: "new-job" });

    await docOcrPost({ formData: () => Promise.resolve(new FormData()) }, {
      params: Promise.resolve({ key: "scan" }),
    });
    expect(createOnlineOcrJob).toHaveBeenCalledWith("https://signed/scan", "scan", "image/jpeg");
  });

  it("returns 500 on failure", async () => {
    vi.mocked(getCachedOcrResult).mockRejectedValue(new Error("redis down"));
    const res = await docOcrPost({ formData: () => Promise.resolve(new FormData()) }, {
      params: Promise.resolve({ key: "a.pdf" }),
    });
    expect(res.status).toBe(500);
    expect((await res.json()).success).toBe(false);
  });
});
