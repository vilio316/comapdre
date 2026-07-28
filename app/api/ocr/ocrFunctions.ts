import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

export async function processLocalImage(file: File) {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const request = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: [
      { type: "text", text: "Extract all text from this image." },
      {
        type: "image",
        data: base64,
        mime_type: file.type || "image/jpeg",
      },
    ],
  });

  return request.output_text;
}
