import { describe, it, expect, vi, beforeEach } from "vitest";

const { interactionsCreate } = vi.hoisted(() => ({
  interactionsCreate: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function () {
    return {
      interactions: {
        create: interactionsCreate,
      },
    };
  }),
}));

import { buildMcqSchema, generateMcqs } from "@/app/lib/mcq-schema";

describe("buildMcqSchema", () => {
  it("builds an array schema with exactly count questions", () => {
    const schema = buildMcqSchema(5);
    expect(schema.type).toBe("object");
    expect(schema.required).toContain("questions");
    expect(schema.properties.questions.minItems).toBe(5);
    expect(schema.properties.questions.maxItems).toBe(5);
  });

  it("passes the requested count through", () => {
    const schema = buildMcqSchema(3);
    expect(schema.properties.questions.minItems).toBe(3);
    expect(schema.properties.questions.maxItems).toBe(3);
  });
});

describe("generateMcqs", () => {
  beforeEach(() => {
    interactionsCreate.mockReset();
  });

  it("returns parsed MCQs when the model returns valid JSON", async () => {
    interactionsCreate.mockResolvedValue({
      output_text: JSON.stringify({
        questions: [
          { q: "What is 2+2?", options: ["1", "2", "3", "4"], answer: 3 },
          { q: "What color is the sky?", options: ["Blue", "Red", "Green", "Pink"], answer: 0 },
        ],
      }),
    });

    const result = await generateMcqs([{ type: "text", text: "content" }], 2);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].answer).toBe(3);
    expect(interactionsCreate).toHaveBeenCalledTimes(1);
  });

  it("throws when the model returns invalid question structure", async () => {
    interactionsCreate.mockResolvedValue({
      output_text: JSON.stringify({ questions: [{ q: "x", options: ["a", "b"], answer: 0 }] }),
    });
    await expect(
      generateMcqs([{ type: "text", text: "content" }], 1),
    ).rejects.toThrow(/invalid MCQ payload/i);
  });

  it("throws on malformed JSON", async () => {
    interactionsCreate.mockResolvedValue({ output_text: "not json" });
    await expect(
      generateMcqs([{ type: "text", text: "content" }], 1),
    ).rejects.toThrow();
  });

  it("throws when answer index is out of range", async () => {
    interactionsCreate.mockResolvedValue({
      output_text: JSON.stringify({
        questions: [{ q: "x", options: ["a", "b", "c", "d"], answer: 7 }],
      }),
    });
    await expect(
      generateMcqs([{ type: "text", text: "content" }], 1),
    ).rejects.toThrow(/invalid MCQ payload/i);
  });

  it("throws when questions array is empty", async () => {
    interactionsCreate.mockResolvedValue({
      output_text: JSON.stringify({ questions: [] }),
    });
    await expect(
      generateMcqs([{ type: "text", text: "content" }], 1),
    ).rejects.toThrow(/invalid MCQ payload/i);
  });
});
