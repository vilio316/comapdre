import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/lib/job-manager", () => ({
  getJobStatus: vi.fn(),
  getMcqJobStatus: vi.fn(),
  getCompileJobStatus: vi.fn(),
  getPdfJobStatus: vi.fn(),
  getMcqResult: vi.fn(),
}));

vi.mock("@/app/lib/mcq-history", () => ({
  listMcqHistory: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

import { GET as ocrStatusGet } from "@/app/api/ocr/status/[jobId]/route";
import { GET as mcqStatusGet } from "@/app/api/mcq/status/[jobId]/route";
import { GET as compileStatusGet } from "@/app/api/compile/status/[jobId]/route";
import { GET as pdfStatusGet } from "@/app/api/compile/pdf/status/[jobId]/route";
import { GET as mcqResultGet } from "@/app/api/mcq/result/route";
import { GET as mcqHistoryGet } from "@/app/api/mcq/history/route";
import {
  getJobStatus,
  getMcqJobStatus,
  getCompileJobStatus,
  getPdfJobStatus,
  getMcqResult,
} from "@/app/lib/job-manager";
import { listMcqHistory } from "@/app/lib/mcq-history";
import { auth } from "@/lib/auth";

const params = (jobId: string) => ({ params: Promise.resolve({ jobId }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "u1", email: "a@b.c" },
    session: {},
  } as never);
});

describe("GET /api/ocr/status/[jobId]", () => {
  it("returns 404 when the job is missing", async () => {
    vi.mocked(getJobStatus).mockResolvedValue(null);
    const res = await ocrStatusGet({} as Request, params("missing"));
    expect(res.status).toBe(404);
  });

  it("returns done status with the extracted result", async () => {
    vi.mocked(getJobStatus).mockResolvedValue({
      status: "done",
      result: "text",
      error: undefined,
      createdAt: 1,
    });
    const res = await ocrStatusGet({} as Request, params("j1"));
    expect(await res.json()).toEqual({ status: "done", result: "text", error: undefined });
  });

  it("returns failed status with the error", async () => {
    vi.mocked(getJobStatus).mockResolvedValue({
      status: "failed",
      result: undefined,
      error: "quota exceeded",
      createdAt: 1,
    });
    const res = await ocrStatusGet({} as Request, params("j1"));
    expect(await res.json()).toEqual({ status: "failed", error: "quota exceeded" });
  });
});

describe("GET /api/mcq/status/[jobId]", () => {
  it("returns 404 when the job is missing", async () => {
    vi.mocked(getMcqJobStatus).mockResolvedValue(null);
    const res = await mcqStatusGet({} as Request, params("missing"));
    expect(res.status).toBe(404);
  });

  it("returns done status with the resultKey", async () => {
    vi.mocked(getMcqJobStatus).mockResolvedValue({
      status: "done",
      resultKey: "mcq:v1:5:abc",
      error: undefined,
      createdAt: 1,
    });
    const res = await mcqStatusGet({} as Request, params("j1"));
    expect(await res.json()).toEqual({ status: "done", resultKey: "mcq:v1:5:abc", error: undefined });
  });
});

describe("GET /api/compile/status/[jobId] and pdf status", () => {
  it("returns compile status with result", async () => {
    vi.mocked(getCompileJobStatus).mockResolvedValue({
      status: "done",
      result: { text: "compiled", sources: ["a.pdf"] },
      error: undefined,
      createdAt: 1,
    });
    const res = await compileStatusGet({} as Request, params("j1"));
    expect(await res.json()).toEqual({
      status: "done",
      result: { text: "compiled", sources: ["a.pdf"] },
      error: undefined,
    });
  });

  it("returns pdf status", async () => {
    vi.mocked(getPdfJobStatus).mockResolvedValue({
      status: "processing",
      result: undefined,
      error: undefined,
      createdAt: 1,
    });
    const res = await pdfStatusGet({} as Request, params("j1"));
    expect(await res.json()).toEqual({ status: "processing", error: undefined });
  });
});

describe("GET /api/mcq/result", () => {
  it("returns 400 when the key is missing", async () => {
    const url = new URL("http://localhost/api/mcq/result");
    const res = await mcqResultGet({ nextUrl: url } as never);
    expect(res.status).toBe(400);
  });

  it("returns 404 when the result is not cached", async () => {
    vi.mocked(getMcqResult).mockResolvedValue(null);
    const url = new URL("http://localhost/api/mcq/result?key=abc");
    const res = await mcqResultGet({ nextUrl: url } as never);
    expect(res.status).toBe(404);
  });

  it("parses and returns cached mcq results", async () => {
    const payload = JSON.stringify({ questions: [{ q: "q", options: ["a", "b", "c", "d"], answer: 0 }] });
    vi.mocked(getMcqResult).mockResolvedValue(payload);
    const url = new URL("http://localhost/api/mcq/result?key=abc");
    const res = await mcqResultGet({ nextUrl: url } as never);
    expect(await res.json()).toEqual({ questions: [{ q: "q", options: ["a", "b", "c", "d"], answer: 0 }] });
  });

  it("returns 500 for malformed cached json", async () => {
    vi.mocked(getMcqResult).mockResolvedValue("not-json");
    const url = new URL("http://localhost/api/mcq/result?key=abc");
    const res = await mcqResultGet({ nextUrl: url } as never);
    expect(res.status).toBe(500);
  });

  it("falls back to decoding the key", async () => {
    vi.mocked(getMcqResult)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("{}");
    const url = new URL("http://localhost/api/mcq/result?key=a%20b");
    const res = await mcqResultGet({ nextUrl: url } as never);
    expect(res.status).toBe(200);
    expect(getMcqResult).toHaveBeenNthCalledWith(2, "a b");
  });
});

describe("GET /api/mcq/history", () => {
  const headers = new Headers();

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await mcqHistoryGet({ headers } as Request);
    expect(res.status).toBe(401);
  });

  it("returns history for an authenticated user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1", email: "a@b.c" },
      session: {},
    } as never);
    vi.mocked(listMcqHistory).mockResolvedValue([
      { resultKey: "mcq:v1:5:abc", keys: ["n.pdf"], count: 5, createdAt: 1 },
    ] as never);

    const res = await mcqHistoryGet({ headers } as Request);
    expect((await res.json()).history).toHaveLength(1);
    expect(listMcqHistory).toHaveBeenCalledWith(100);
  });
});
