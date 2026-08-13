import { describe, it, expect } from "vitest";
import { classifyError } from "@/app/lib/error-classify";

describe("classifyError", () => {
  it("returns a friendly network message for connection errors", () => {
    const res = classifyError(new Error("fetch failed: Failed to fetch"));
    expect(res.title).toBe("Connection problem");
    expect(res.message).toContain("internet connection");
  });

  it("returns a busy message for quota/rate limit errors", () => {
    expect(classifyError(new Error("Quota exceeded 429")).title).toBe(
      "AI service is busy",
    );
    expect(classifyError(new Error("rate limit")).title).toBe(
      "AI service is busy",
    );
  });

  it("returns a sign-in prompt for auth errors", () => {
    const res = classifyError(new Error("Unauthorized"), "mcq");
    expect(res.title).toBe("Please sign in again");
    expect(res.message).toContain("MCQ Generator");
  });

  it("returns a storage message for r2/storage errors", () => {
    expect(classifyError(new Error("r2 bucket not reachable")).title).toBe(
      "Storage trouble",
    );
  });

  it("returns a processing message for job/queue errors", () => {
    const res = classifyError(new Error("BullMQ job failed"), "ocr");
    expect(res.title).toBe("Background processing issue");
    expect(res.message).toContain("OCR Scanner");
  });

  it("returns a not-found message", () => {
    expect(classifyError(new Error("Not found")).title).toBe("Not found");
  });

  it("returns an input message for validation errors", () => {
    expect(classifyError(new Error("File type unsupported")).title).toBe(
      "Something's off with that input",
    );
  });

  it("falls back to a generic message", () => {
    const res = classifyError(new Error("some obscure crash"));
    expect(res.title).toBe("Something went wrong");
    expect(res.message).toContain("Compadre");
  });

  it("uses the context label in the generic message", () => {
    const res = classifyError(new Error("boom"), "documents");
    expect(res.message).toContain("Document Library");
  });

  it("handles missing error message", () => {
    const res = classifyError({} as Error);
    expect(res.title).toBe("Something went wrong");
  });
});
