import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/cloudflareHelper", () => ({
  uploadToR2: vi.fn(),
  deleteObjectFromR2: vi.fn(),
  getObjectSignedUrl: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(), updateUser: vi.fn() } },
}));

import { POST as uploadPost } from "@/app/api/upload/route";
import { POST as avatarPost } from "@/app/api/upload/avatar/route";
import { GET as avatarGet } from "@/app/api/avatar/route";
import { uploadToR2, deleteObjectFromR2, getObjectSignedUrl } from "@/lib/cloudflareHelper";
import { auth } from "@/lib/auth";

function fdWithFile(file?: File, tags?: string) {
  const fd = new FormData();
  if (file) fd.append("file", file);
  if (tags !== undefined) fd.append("tags", tags);
  return { formData: () => Promise.resolve(fd) };
}

const pdfFile = () => new File([new Uint8Array(100)], "notes.pdf", { type: "application/pdf" });
const pngFile = () => new File([new Uint8Array(100)], "a.png", { type: "image/png" });

const authedUser = { user: { id: "u1", email: "a@b.c" }, session: {} } as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(authedUser);
});

describe("POST /api/upload", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await uploadPost(fdWithFile(pdfFile()) as never);
    expect(res.status).toBe(401);
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it("returns 400 when no file is provided", async () => {
    const res = await uploadPost(fdWithFile() as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file provided" });
  });

  it("uploads a file with its detected mime type", async () => {
    vi.mocked(uploadToR2).mockResolvedValue({ key: "notes.pdf" });
    const res = await uploadPost(fdWithFile(pdfFile()) as never);
    expect(await res.json()).toEqual({ success: true });
    expect(uploadToR2).toHaveBeenCalledWith(expect.any(Buffer), "notes.pdf", "application/pdf", undefined);
  });

  it("parses and forwards tags", async () => {
    vi.mocked(uploadToR2).mockResolvedValue({ key: "notes.pdf" });
    await uploadPost(fdWithFile(pdfFile(), '["biology","notes"]') as never);
    expect(uploadToR2.mock.calls[0][3]).toEqual(["biology", "notes"]);
  });

  it("returns 500 when upload fails", async () => {
    vi.mocked(uploadToR2).mockRejectedValue(new Error("r2 down"));
    const res = await uploadPost(fdWithFile(pdfFile()) as never);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "r2 down" });
  });
});

describe("POST /api/upload/avatar", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await avatarPost(fdWithFile(pngFile()) as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "u1" }, session: {} } as never);
    const res = await avatarPost(fdWithFile() as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported file types", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "u1" }, session: {} } as never);
    const gif = new File([new Uint8Array(10)], "a.gif", { type: "image/gif" });
    const res = await avatarPost(fdWithFile(gif) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Unsupported file type");
  });

  it("returns 400 when the file exceeds 5 MB", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "u1" }, session: {} } as never);
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "a.png", { type: "image/png" });
    const res = await avatarPost(fdWithFile(big) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("5 MB");
  });

  it("uploads an avatar and updates the user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1", image: null },
      session: {},
    } as never);
    vi.mocked(uploadToR2).mockResolvedValue({ key: "avatars/u1.png" });
    vi.mocked(auth.api.updateUser).mockResolvedValue({} as never);

    const res = await avatarPost(fdWithFile(pngFile()) as never);
    expect(await res.json()).toEqual({ success: true, image: "avatars/u1.png" });
    expect(uploadToR2).toHaveBeenCalledWith(expect.any(Buffer), "avatars/u1.png", "image/png");
    expect(auth.api.updateUser).toHaveBeenCalledWith({
      body: { image: "avatars/u1.png" },
      headers: undefined,
    });
  });

  it("deletes the previous avatar when it is a stored object", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1", image: "avatars/u1.jpg" },
      session: {},
    } as never);
    vi.mocked(uploadToR2).mockResolvedValue({ key: "avatars/u1.png" });
    vi.mocked(auth.api.updateUser).mockResolvedValue({} as never);

    await avatarPost(fdWithFile(pngFile()) as never);
    expect(deleteObjectFromR2).toHaveBeenCalledWith("avatars/u1.jpg");
  });

  it("does not try to delete an external image url", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1", image: "https://lh3.google.com/x" },
      session: {},
    } as never);
    vi.mocked(uploadToR2).mockResolvedValue({ key: "avatars/u1.png" });
    vi.mocked(auth.api.updateUser).mockResolvedValue({} as never);

    await avatarPost(fdWithFile(pngFile()) as never);
    expect(deleteObjectFromR2).not.toHaveBeenCalled();
  });
});

describe("GET /api/avatar", () => {
  it("returns url: null when there is no session or image", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await avatarGet({ headers: new Headers() } as never);
    expect(await res.json()).toEqual({ url: null });
  });

  it("resolves a signed url for stored avatars", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1", image: "avatars/u1.png" },
      session: {},
    } as never);
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/avatars/u1.png");
    const res = await avatarGet({ headers: new Headers() } as never);
    expect(await res.json()).toEqual({ url: "https://signed/avatars/u1.png" });
  });

  it("returns external urls as-is", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1", image: "https://lh3.google.com/x" },
      session: {},
    } as never);
    const res = await avatarGet({ headers: new Headers() } as never);
    expect(await res.json()).toEqual({ url: "https://lh3.google.com/x" });
  });
});
