import { GoogleGenAI } from "@google/genai";
import { sanitizeText } from "@/app/lib/text-sanitize";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

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
      ? "Extract all text from this image."
      : "Summarise the contents of all these images into a single response.";

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

export async function processOnlineImage(url: string) {
  const processOnlineInteraction = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: [
      { type: "text", text: "Extract all text from this image." },
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
      { type: "text", text: "Extract all text from this document." },
      {
        type: "document",
        data: base64,
        mime_type: mimeType,
      },
    ],
  });

  return sanitizeText(request.output_text);
}
