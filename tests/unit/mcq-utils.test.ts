import { describe, it, expect } from "vitest";
import {
  resolveMime,
  formatBytes,
  extToMime,
  SUPPORTED_MIME_TYPES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  MAX_MCQS,
} from "@/app/lib/mcq-utils";

describe("resolveMime", () => {
  it("returns declared mime when supported", () => {
    expect(resolveMime("doc.pdf", "application/pdf")).toBe("application/pdf");
    expect(resolveMime("pic.png", "image/png")).toBe("image/png");
    expect(resolveMime("pic.webp", "image/webp")).toBe("image/webp");
  });

  it("falls back to extension when declared mime is missing or unsupported", () => {
    expect(resolveMime("doc.pdf", "")).toBe("application/pdf");
    expect(resolveMime("doc.PDF", "application/octet-stream")).toBe("application/pdf");
    expect(resolveMime("notes.docx", "text/plain")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(resolveMime("slide.pptx", "")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(resolveMime("photo.jpeg", "")).toBe("image/jpeg");
  });

  it("is case-insensitive for extensions", () => {
    expect(resolveMime("PHOTO.JPG", "")).toBe("image/jpeg");
    expect(resolveMime("Doc.PDF", "")).toBe("application/pdf");
  });

  it("throws for unsupported file types", () => {
    expect(() => resolveMime("archive.zip", "")).toThrow(/Unsupported file type/);
    expect(() => resolveMime("script.sh", "text/x-sh")).toThrow(/Unsupported file type/);
  });
});

describe("extToMime", () => {
  it("maps all supported extensions", () => {
    expect(extToMime.pdf).toBe("application/pdf");
    expect(extToMime.docx).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(extToMime.ppt).toBe("application/vnd.ms-powerpoint");
    expect(extToMime.pptx).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(extToMime.jpg).toBe("image/jpeg");
    expect(extToMime.jpeg).toBe("image/jpeg");
    expect(extToMime.png).toBe("image/png");
    expect(extToMime.webp).toBe("image/webp");
  });
});

describe("SUPPORTED_MIME_TYPES", () => {
  it("contains images, pdf, docx, ppt, pptx", () => {
    expect(SUPPORTED_MIME_TYPES.has("image/jpeg")).toBe(true);
    expect(SUPPORTED_MIME_TYPES.has("image/png")).toBe(true);
    expect(SUPPORTED_MIME_TYPES.has("image/webp")).toBe(true);
    expect(SUPPORTED_MIME_TYPES.has("application/pdf")).toBe(true);
    expect(SUPPORTED_MIME_TYPES.has("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    expect(SUPPORTED_MIME_TYPES.has("text/plain")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats KB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(512)).toBe("0.5 KB");
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats MB", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("limits", () => {
  it("exports sane constants", () => {
    expect(MAX_FILES).toBeGreaterThan(0);
    expect(MAX_TOTAL_BYTES).toBeGreaterThan(0);
    expect(MAX_MCQS).toBeGreaterThan(0);
  });
});
