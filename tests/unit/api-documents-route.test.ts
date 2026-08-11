import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/cloudflareHelper", () => ({
  listObjectsInBucket: vi.fn(),
  getObjectSignedUrl: vi.fn(),
  deleteObjectFromR2: vi.fn(),
}));

import { GET as listGet } from "@/app/api/documents/route";
import { GET as docGet, DELETE as docDelete } from "@/app/api/documents/[key]/route";
import { listObjectsInBucket, getObjectSignedUrl, deleteObjectFromR2 } from "@/lib/cloudflareHelper";

const params = (key: string) => ({ params: Promise.resolve({ key }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/documents", () => {
  it("lists documents with formatted metadata", async () => {
    vi.mocked(listObjectsInBucket).mockResolvedValue([
      { name: "notes.pdf", size: 2048, uploaded: new Date("2026-01-02T00:00:00Z") },
      { name: "folder/photo.JPG", size: 5 * 1024 * 1024, uploaded: new Date("2026-01-03T00:00:00Z") },
      { name: "readme.md", size: 500, uploaded: new Date("2026-01-04T00:00:00Z") },
    ]);

    const res = await listGet();
    const { docs } = await res.json();

    expect(docs).toHaveLength(3);
    expect(docs[0]).toMatchObject({ id: "notes.pdf", name: "notes.pdf", type: "PDF", size: "2.0 KB", uploaded: "2026-01-02" });
    expect(docs[1]).toMatchObject({ name: "photo.JPG", type: "JPEG", size: "5.0 MB" });
    expect(docs[2]).toMatchObject({ name: "readme.md", type: "MD" });
  });

  it("returns 500 when listing fails", async () => {
    vi.mocked(listObjectsInBucket).mockRejectedValue(new Error("r2 down"));
    const res = await listGet();
    expect(res.status).toBe(500);
  });
});

describe("GET /api/documents/[key]", () => {
  it("returns a signed url for a pdf", async () => {
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.pdf");
    const res = await docGet({} as Request, params("notes.pdf"));
    expect(await res.json()).toEqual({
      url: "https://signed/notes.pdf",
      name: "notes.pdf",
      type: "pdf",
      text: undefined,
    });
    expect(getObjectSignedUrl).toHaveBeenCalledWith("notes.pdf");
  });

  it("fetches text content for markdown files", async () => {
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.md");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "# Notes" }));
    const res = await docGet({} as Request, params("notes.md"));
    const body = await res.json();
    expect(body.type).toBe("md");
    expect(body.text).toBe("# Notes");
  });

  it("leaves text undefined when the fetch fails", async () => {
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.md");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const res = await docGet({} as Request, params("notes.md"));
    expect((await res.json()).text).toBeUndefined();
  });

  it("returns 500 when signing fails", async () => {
    vi.mocked(getObjectSignedUrl).mockRejectedValue(new Error("no creds"));
    const res = await docGet({} as Request, params("notes.pdf"));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/documents/[key]", () => {
  it("deletes the document and returns success", async () => {
    vi.mocked(deleteObjectFromR2).mockResolvedValue({ key: "notes.pdf" });
    const res = await docDelete({} as Request, params("notes.pdf"));
    expect(await res.json()).toEqual({ success: true });
    expect(deleteObjectFromR2).toHaveBeenCalledWith("notes.pdf");
  });

  it("returns 500 when deletion fails", async () => {
    vi.mocked(deleteObjectFromR2).mockRejectedValue(new Error("r2 down"));
    const res = await docDelete({} as Request, params("notes.pdf"));
    expect(res.status).toBe(500);
  });
});
