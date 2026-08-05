import { GoogleGenAI } from "@google/genai";
import { sanitizeText } from "@/app/lib/text-sanitize";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

const MATH_PROMPT_SUFFIX =
  " Transcribe mathematical formulas, equations, and scientific notation exactly as they appear. " +
  "Use Unicode symbols (π, ∑, ∫, √, ≤, ≥, ≠, ×, ÷, ±, ∞, θ, α, β, Δ, Ω, etc.) rather than ASCII approximations. " +
  "Render inline math as $...$ and standalone equations as $$...$$, preserving superscripts, subscripts, " +
  "fractions, and operators. Do not translate symbols into words (e.g. keep 'x²' not 'x squared').";

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function processLocalImages(files: File[]) {
  const images = await Promise.all(
    files.map(async (f) => ({
      data: await fileToBase64(f),
      mime_type: f.type || "image/jpeg",
    })),
  );

  const prompt =
    images.length === 1
      ? "Extract all text from this image verbatim." + MATH_PROMPT_SUFFIX
      : "Summarise the contents of all these images into a single response, preserving mathematical notation." + MATH_PROMPT_SUFFIX;

  const request = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: [
      { type: "text", text: prompt },
      ...images.map((img) => ({
        type: "image" as const,
        data: img.data,
        mime_type: img.mime_type,
      })),
    ],
  });

  return sanitizeText(request.output_text);
}

export async function processLocalDocument(file: File, mimeType?: string) {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const request = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: [
      {
        type: "text",
        text: "Extract all text from this document verbatim." + MATH_PROMPT_SUFFIX,
      },
      {
        type: "document",
        data: base64,
        mime_type: mimeType || file.type || "application/pdf",
      },
    ],
  });

  return sanitizeText(request.output_text);
}

export async function processOnlineImage(url: string) {
  const processOnlineInteraction = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: [
      {
        type: "text",
        text: "Extract all text from this image verbatim." + MATH_PROMPT_SUFFIX,
      },
      {
        type: "image",
        uri: url,
      },
    ],
  });
  return sanitizeText(processOnlineInteraction.output_text);
}

export async function processOnlineDocument(url: string, mimeType: string) {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const base64 = buffer.toString("base64");

  const request = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: [
      {
        type: "text",
        text: "Extract all text from this document verbatim." + MATH_PROMPT_SUFFIX,
      },
      {
        type: "document",
        data: base64,
        mime_type: mimeType,
      },
    ],
  });

  return sanitizeText(request.output_text);
}
