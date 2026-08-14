import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "crypto";

vi.mock("@/app/lib/job-manager", () => ({
  createLocalMcqJob: vi.fn(),
  createOnlineMcqJob: vi.fn(),
  getMcqResult: vi.fn(),
}));

vi.mock("@/app/lib/mcq-queue", () => ({
  mcqQueue: { getJobs: vi.fn() },
}));

vi.mock("@/app/lib/mcq-history", () => ({
  recordMcqHistory: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(async () => undefined),
  default: { writeFile: vi.fn(async () => undefined) },
}));

vi.mock("@/app/lib/org-membership", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

import { POST as mcqPost } from "@/app/api/mcq/route";
import { createLocalMcqJob, createOnlineMcqJob, getMcqResult } from "@/app/lib/job-manager";
import { mcqQueue } from "@/app/lib/mcq-queue";
import { recordMcqHistory } from "@/app/lib/mcq-history";
import { getOrgContext } from "@/app/lib/org-membership";
import { auth } from "@/lib/auth";

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

function pngFile(name = "a.png", bytes = 10) {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

function mcqResultKey(keys: string[], count: number): string {
  const hash = createHash("sha256")
    .update(keys.slice().sort().join("|"))
    .digest("hex")
    .slice(0, 32);
  return `mcq:v1:org-1:${count}:${hash}`;
}

const orgContext = {
  user: { id: "u1", name: "Alice", email: "a@b.c" },
  organizationId: "org-1",
  role: "class_rep",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOrgContext).mockResolvedValue(orgContext);
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "u1", email: "a@b.c" },
    session: {},
  } as never);
});

describe("POST /api/mcq", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await mcqPost(buildRequest({ count: "5", keys: ["notes.pdf"] }));
    expect(res.status).toBe(401);
    expect(createLocalMcqJob).not.toHaveBeenCalled();
  });

  it("returns 400 when no files or keys are provided", async () => {
    const res = await mcqPost(buildRequest({ count: "5" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No files provided" });
  });

  it("returns 400 when too many inputs are provided", async () => {
    const files = Array.from({ length: 21 }, (_, i) => pngFile(`f${i}.png`));
    const res = await mcqPost(buildRequest({ files, count: "5" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Too many documents");
  });

  it("returns 400 when the total byte size exceeds the limit", async () => {
    const big = new File([new Uint8Array(16 * 1024 * 1024)], "big.png", { type: "image/png" });
    const res = await mcqPost(buildRequest({ files: [big], count: "5" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("MB limit");
  });

  it("returns a cached result when the same content is requested", async () => {
    vi.mocked(getMcqResult).mockResolvedValue(JSON.stringify({ questions: [] }));
    const res = await mcqPost(buildRequest({ keys: ["notes.pdf"], count: "5" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.cached).toBe(true);
    expect(body.resultKey).toContain("mcq:v1:org-1:5:");
    expect(recordMcqHistory).toHaveBeenCalledTimes(1);
  });

  it("reuses an active job with the same resultKey", async () => {
    vi.mocked(getMcqResult).mockResolvedValue(null);
    const key = mcqResultKey(["notes.pdf"], 5);
    vi.mocked(mcqQueue.getJobs).mockResolvedValue([
      { id: "active-1", data: { resultKey: key } },
    ] as never);

    const res = await mcqPost(buildRequest({ keys: ["notes.pdf"], count: "5" }));
    expect(await res.json()).toMatchObject({ jobId: "active-1" });
    expect(createOnlineMcqJob).not.toHaveBeenCalled();
  });

  it("enqueues a local job when files are uploaded", async () => {
    vi.mocked(getMcqResult).mockResolvedValue(null);
    vi.mocked(mcqQueue.getJobs).mockResolvedValue([]);
    vi.mocked(createLocalMcqJob).mockResolvedValue({ id: "local-job" });

    const res = await mcqPost(buildRequest({ files: [pngFile("a.png")], count: "5" }));
    expect(await res.json()).toMatchObject({ jobId: "local-job" });
    expect(createLocalMcqJob).toHaveBeenCalledTimes(1);
    expect(createOnlineMcqJob).not.toHaveBeenCalled();
  });

  it("enqueues an online job when only stored keys are provided", async () => {
    vi.mocked(getMcqResult).mockResolvedValue(null);
    vi.mocked(mcqQueue.getJobs).mockResolvedValue([]);
    vi.mocked(createOnlineMcqJob).mockResolvedValue({ id: "online-job" });

    const res = await mcqPost(buildRequest({ keys: ["notes.pdf"], count: "7" }));
    const body = await res.json();
    expect(body.jobId).toBe("online-job");
    expect(createOnlineMcqJob).toHaveBeenCalledWith(["notes.pdf"], 7, body.resultKey);
  });

  it("clamps the count to MAX_MCQS", async () => {
    vi.mocked(getMcqResult).mockResolvedValue(null);
    vi.mocked(mcqQueue.getJobs).mockResolvedValue([]);
    vi.mocked(createOnlineMcqJob).mockResolvedValue({ id: "x" });

    await mcqPost(buildRequest({ keys: ["notes.pdf"], count: "9999" }));
    expect(createOnlineMcqJob.mock.calls[0][1]).toBeLessThanOrEqual(100);
  });

  it("returns 500 when queueing fails", async () => {
    vi.mocked(getMcqResult).mockRejectedValue(new Error("redis down"));
    const res = await mcqPost(buildRequest({ keys: ["notes.pdf"], count: "5" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "redis down" });
  });
});
