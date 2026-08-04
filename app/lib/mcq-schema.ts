import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

export interface McqQuestion {
  q: string;
  options: string[];
  answer: number;
}

export interface McqSet {
  questions: McqQuestion[];
}

const questionSchema = {
  type: "object",
  properties: {
    q: { type: "string" },
    options: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: { type: "string" },
    },
    answer: { type: "integer" },
  },
  required: ["q", "options", "answer"],
};

export function buildMcqSchema(count: number) {
  return {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: questionSchema,
      },
    },
    required: ["questions"],
  };
}

export type McqInputPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mime_type: string }
  | { type: "document"; data: string; mime_type: string };

export async function generateMcqs(
  input: McqInputPart[],
  count = 5,
): Promise<McqSet> {
  const request = await ai.interactions.create({
    model: "gemini-3.6-flash",
    system_instruction:
      "You are an expert exam writer. Create multiple-choice questions that test understanding of the provided document. Each question must have exactly 4 plausible options and exactly one correct answer, identified by its 0-based index. Vary the position of the correct answer across questions. Do not invent facts that are not supported by the document.",
    input: [
      {
        type: "text",
        text: `Generate exactly ${count} multiple-choice questions based on the document(s) attached.`,
      },
      ...input,
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: buildMcqSchema(count),
    },
  });

  const raw = request.output_text ?? "";
  const parsed = JSON.parse(raw) as McqSet;

  if (
    !Array.isArray(parsed.questions) ||
    parsed.questions.some(
      (q) =>
        typeof q.q !== "string" ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.answer !== "number" ||
        q.answer < 0 ||
        q.answer > 3,
    )
  ) {
    throw new Error("Gemini returned an invalid MCQ payload");
  }

  return parsed;
}
