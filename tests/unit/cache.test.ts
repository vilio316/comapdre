import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMemRedis, type MemRedis } from "@/tests/helpers/mem-redis";

const { memHolder } = vi.hoisted(() => ({ memHolder: { mem: null as MemRedis | null } }));

vi.mock("ioredis", () => ({
  default: function RedisMock() {
    if (!memHolder.mem) memHolder.mem = createMemRedis();
    return memHolder.mem;
  },
}));

import { getCachedOcrResult, setCachedOcrResult } from "@/app/lib/ocr-cache";
import { getMcqResult, setMcqResult } from "@/app/lib/mcq-cache";

beforeEach(() => {
  memHolder.mem!.reset();
});

describe("ocr-cache", () => {
  it("returns null for a missing key", async () => {
    expect(await getCachedOcrResult("missing")).toBeNull();
  });

  it("stores and retrieves a result under a prefixed key", async () => {
    await setCachedOcrResult("doc.pdf", "extracted text");
    expect(await getCachedOcrResult("doc.pdf")).toBe("extracted text");
    expect(memHolder.mem!.setex).toHaveBeenCalledWith("ocr:cache:doc.pdf", expect.any(Number), "extracted text");
  });
});

describe("mcq-cache", () => {
  it("returns null for a missing key", async () => {
    expect(await getMcqResult("missing")).toBeNull();
  });

  it("stores and retrieves a result under a prefixed key", async () => {
    await setMcqResult("mcq:v1:5:abc", JSON.stringify({ questions: [] }));
    const out = await getMcqResult("mcq:v1:5:abc");
    expect(out).toBe('{"questions":[]}');
    expect(memHolder.mem!.setex).toHaveBeenCalledWith(
      "mcq:result:mcq:v1:5:abc",
      expect.any(Number),
      '{"questions":[]}',
    );
  });

  it("does not leak between keys", async () => {
    await setMcqResult("key-a", "value-a");
    expect(await getMcqResult("key-b")).toBeNull();
  });
});

