import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("better-auth/cookies", () => ({
  getSessionCookie: vi.fn(),
}));

import { proxy } from "@/proxy";
import { getSessionCookie } from "better-auth/cookies";

const request = (url: string, method = "GET") =>
  new NextRequest(`http://localhost${url}`, { method });

describe("proxy auth enforcement", () => {
  it("allows document reads without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/documents"));
    expect(res.status).toBe(200);
    const res2 = await proxy(request("/api/documents/notes.pdf"));
    expect(res2.status).toBe(200);
  });

  it("blocks document deletes without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/documents/notes.pdf", "DELETE"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("allows document deletes with a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue("session-token");
    const res = await proxy(request("/api/documents/notes.pdf", "DELETE"));
    expect(res.status).toBe(200);
  });

  it("allows auth endpoints without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/auth/session"));
    expect(res.status).toBe(200);
  });

  it("allows /api/docs without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/docs"));
    expect(res.status).toBe(200);
  });

  it("blocks ocr submission without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/ocr", "POST"));
    expect(res.status).toBe(401);
  });

  it("blocks mcq submission without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/mcq", "POST"));
    expect(res.status).toBe(401);
  });

  it("blocks compile submission without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/compile", "POST"));
    expect(res.status).toBe(401);
  });

  it("allows ocr submission with a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue("session-token");
    const res = await proxy(request("/api/ocr", "POST"));
    expect(res.status).toBe(200);
  });

  it("blocks job status polling without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/ocr/status/job-1"));
    expect(res.status).toBe(401);
  });

  it("blocks document ocr without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/documents/notes.pdf/ocr", "POST"));
    expect(res.status).toBe(401);
  });

  it("allows avatar reads without a session", async () => {
    vi.mocked(getSessionCookie).mockReturnValue(null);
    const res = await proxy(request("/api/avatar"));
    expect(res.status).toBe(200);
  });
});
