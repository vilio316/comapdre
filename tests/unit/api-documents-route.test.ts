import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/cloudflareHelper", () => ({
  listObjectsInBucket: vi.fn(),
  getObjectSignedUrl: vi.fn(),
  deleteObjectFromR2: vi.fn(),
}));

vi.mock("@/app/lib/org-membership", () => ({
  getOrgContext: vi.fn(),
  canCompile: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    document: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { GET as listGet } from "@/app/api/documents/route";
import { GET as docGet, DELETE as docDelete } from "@/app/api/documents/[key]/route";
import { getObjectSignedUrl, deleteObjectFromR2 } from "@/lib/cloudflareHelper";
import { getOrgContext, canCompile } from "@/app/lib/org-membership";
import prisma from "@/lib/prisma";

const params = (key: string) => ({ params: Promise.resolve({ key }) });

const orgContext = {
  user: { id: "u1", name: "Alice", email: "a@b.c" },
  organizationId: "org-1",
  role: "class_rep",
};

function mockAuthed() {
  vi.mocked(getOrgContext).mockResolvedValue(orgContext);
}

const docRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "d1",
  key: "notes.pdf",
  name: "notes.pdf",
  type: "PDF",
  size: 2048,
  tags: null,
  organizationId: "org-1",
  userId: "u1",
  createdAt: new Date("2026-01-02T00:00:00Z"),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("GET /api/documents", () => {
  it("lists documents for the active organization", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      docRow(),
      docRow({ key: "org-1/folder/photo.JPG", name: "photo.JPG", type: "JPEG", size: 5 * 1024 * 1024, createdAt: new Date("2026-01-03T00:00:00Z") }),
      docRow({ key: "org-1/readme.md", name: "readme.md", type: "MD", size: 500, tags: JSON.stringify(["docs"]), createdAt: new Date("2026-01-04T00:00:00Z") }),
    ]);

    const res = await listGet(new Request("http://localhost/api/documents"));
    const { docs } = await res.json();

    expect(docs).toHaveLength(3);
    expect(docs[0]).toMatchObject({ id: "notes.pdf", name: "notes.pdf", type: "PDF", size: "2.0 KB", uploaded: "2026-01-02", tags: [] });
    expect(docs[1]).toMatchObject({ id: "org-1/folder/photo.JPG", name: "photo.JPG", type: "JPEG", size: "5.0 MB" });
    expect(docs[2]).toMatchObject({ name: "readme.md", type: "MD", tags: ["docs"] });
  });

  it("returns 401 when the user has no active organization", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);
    const res = await listGet(new Request("http://localhost/api/documents"));
    expect(res.status).toBe(401);
    expect(prisma.document.findMany).not.toHaveBeenCalled();
  });

  it("returns 500 when listing fails", async () => {
    vi.mocked(prisma.document.findMany).mockRejectedValue(new Error("db down"));
    const res = await listGet(new Request("http://localhost/api/documents"));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/documents/[key]", () => {
  it("returns 401 when the user has no active organization", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);
    const res = await docGet({} as Request, params("notes.pdf"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the document is not in the active organization", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null);
    const res = await docGet({} as Request, params("notes.pdf"));
    expect(res.status).toBe(404);
  });

  it("returns a signed url for a pdf", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(docRow());
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.pdf");
    const res = await docGet({} as Request, params("notes.pdf"));
    expect(await res.json()).toEqual({
      url: "https://signed/notes.pdf",
      name: "notes.pdf",
      type: "pdf",
      text: undefined,
    });
    expect(getObjectSignedUrl).toHaveBeenCalledWith("notes.pdf");
    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: { key: "notes.pdf", organizationId: "org-1" },
    });
  });

  it("fetches text content for markdown files", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(docRow({ key: "org-1/notes.md", name: "notes.md", type: "MD" }));
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.md");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "# Notes" }));
    const res = await docGet({} as Request, params("notes.md"));
    const body = await res.json();
    expect(body.type).toBe("md");
    expect(body.text).toBe("# Notes");
  });

  it("leaves text undefined when the fetch fails", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(docRow({ key: "org-1/notes.md", name: "notes.md", type: "MD" }));
    vi.mocked(getObjectSignedUrl).mockResolvedValue("https://signed/notes.md");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const res = await docGet({} as Request, params("notes.md"));
    expect((await res.json()).text).toBeUndefined();
  });

  it("returns 500 when signing fails", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(docRow());
    vi.mocked(getObjectSignedUrl).mockRejectedValue(new Error("no creds"));
    const res = await docGet({} as Request, params("notes.pdf"));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/documents/[key]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);
    const res = await docDelete({ headers: new Headers() } as Request, params("notes.pdf"));
    expect(res.status).toBe(401);
    expect(deleteObjectFromR2).not.toHaveBeenCalled();
  });

  it("returns 403 for members without compile permission", async () => {
    vi.mocked(canCompile).mockReturnValue(false);
    const res = await docDelete({ headers: new Headers() } as Request, params("notes.pdf"));
    expect(res.status).toBe(403);
    expect(deleteObjectFromR2).not.toHaveBeenCalled();
  });

  it("returns 404 when the document is not in the active organization", async () => {
    vi.mocked(canCompile).mockReturnValue(true);
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null);
    const res = await docDelete({ headers: new Headers() } as Request, params("notes.pdf"));
    expect(res.status).toBe(404);
    expect(deleteObjectFromR2).not.toHaveBeenCalled();
  });

  it("deletes the document and its database row", async () => {
    vi.mocked(canCompile).mockReturnValue(true);
    vi.mocked(prisma.document.findFirst).mockResolvedValue(docRow({ key: "org-1/notes.pdf", name: "notes.pdf" }));
    vi.mocked(deleteObjectFromR2).mockResolvedValue({ key: "org-1/notes.pdf" });
    vi.mocked(prisma.document.delete).mockResolvedValue({} as never);

    const res = await docDelete({ headers: new Headers() } as Request, params("org-1/notes.pdf"));
    expect(await res.json()).toEqual({ success: true });
    expect(deleteObjectFromR2).toHaveBeenCalledWith("org-1/notes.pdf");
    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("returns 500 when deletion fails", async () => {
    vi.mocked(canCompile).mockReturnValue(true);
    vi.mocked(prisma.document.findFirst).mockResolvedValue(docRow());
    vi.mocked(deleteObjectFromR2).mockRejectedValue(new Error("r2 down"));
    const res = await docDelete({ headers: new Headers() } as Request, params("notes.pdf"));
    expect(res.status).toBe(500);
  });
});
