import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMemRedis, type MemRedis } from "@/tests/helpers/mem-redis";

const { memHolder } = vi.hoisted(() => ({ memHolder: { mem: null as MemRedis | null } }));

vi.mock("ioredis", () => ({
  default: function RedisMock() {
    if (!memHolder.mem) memHolder.mem = createMemRedis();
    return memHolder.mem;
  },
}));

import {
  recordMcqHistory,
  listMcqHistory,
} from "@/app/lib/mcq-history";
import { setMcqResult } from "@/app/lib/mcq-cache";

const mem = () => memHolder.mem;

beforeEach(() => {
  memHolder.mem!.reset();
});

describe("recordMcqHistory", () => {
  it("records a history entry with metadata", async () => {
    await recordMcqHistory({
      resultKey: "mcq:v1:5:abc",
      keys: ["doc1.pdf", "doc2.pdf"],
      createdAt: 1000,
    });
    expect(mem().multi).toHaveBeenCalled();
  });
});

describe("listMcqHistory", () => {
  it("returns entries whose cached result still exists", async () => {
    await setMcqResult(
      "mcq:v1:5:abc",
      JSON.stringify({
        questions: [{ q: "q", options: ["a", "b", "c", "d"], answer: 0 }],
      }),
    );
    await recordMcqHistory({
      resultKey: "mcq:v1:5:abc",
      keys: ["doc1.pdf"],
      createdAt: 2000,
    });

    const history = await listMcqHistory();
    expect(history).toHaveLength(1);
    expect(history[0].resultKey).toBe("mcq:v1:5:abc");
    expect(history[0].keys).toEqual(["doc1.pdf"]);
    expect(history[0].count).toBe(1);
  });

  it("prunes entries whose cached result is gone", async () => {
    await recordMcqHistory({
      resultKey: "mcq:v1:5:gone",
      keys: ["doc1.pdf"],
      createdAt: 3000,
    });

    const history = await listMcqHistory();
    expect(history).toHaveLength(0);
    expect(mem().zrem).toHaveBeenCalled();
  });

  it("prunes entries with malformed cached results", async () => {
    mem().__store.set("mcq:result:mcq:v1:5:bad", "not-json");
    await recordMcqHistory({
      resultKey: "mcq:v1:5:bad",
      keys: ["doc1.pdf"],
      createdAt: 4000,
    });

    const history = await listMcqHistory();
    expect(history).toHaveLength(0);
  });

  it("returns entries newest-first", async () => {
    await setMcqResult(
      "mcq:v1:5:older",
      JSON.stringify({ questions: [{ q: "q", options: ["a", "b", "c", "d"], answer: 0 }] }),
    );
    await setMcqResult(
      "mcq:v1:5:newer",
      JSON.stringify({ questions: [{ q: "q", options: ["a", "b", "c", "d"], answer: 0 }] }),
    );
    await recordMcqHistory({ resultKey: "mcq:v1:5:older", keys: [], createdAt: 1000 });
    await recordMcqHistory({ resultKey: "mcq:v1:5:newer", keys: [], createdAt: 2000 });

    const history = await listMcqHistory();
    expect(history.map((h) => h.resultKey)).toEqual(["mcq:v1:5:newer", "mcq:v1:5:older"]);
  });
});

