import { Queue, Worker, Job } from "bullmq";
import redis from "./redis";
import { uploadToR2 } from "@/lib/cloudflareHelper";
import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";

const PDF_QUEUE = "compile-pdf";

export const pdfQueue = new Queue(PDF_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

let worker: Worker | null = null;

export interface PdfJobResult {
  doc: {
    key: string;
    name: string;
    type: string;
    size: number;
  };
}

interface PdfJobData {
  text: string;
  fileName: string;
  organizationId?: string;
  userId?: string;
}

function sanitizeFileName(input: string): string {
  const trimmed = input.trim();
  const cleaned = trimmed
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\.pdf$/i, "");
  return (cleaned || "Compiled document") + ".pdf";
}

function renderMarkdownToPdf(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 54,
        size: "A4",
        info: { Title: "Compiled Document" },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const lines = text.split("\n");
      for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (/^\s*---+$/.test(line)) {
          doc.moveDown(0.5);
          continue;
        }

        if (/^#{1,3}\s+/.test(line)) {
          const headingText = line.replace(/^#{1,3}\s+/, "").trim();
          doc.moveDown(0.4);
          doc
            .font("Helvetica-Bold")
            .fontSize(13)
            .fillColor("#1B2A4A")
            .text(headingText, { lineGap: 2 });
          doc.moveDown(0.25);
          continue;
        }

        if (line.trim() === "") {
          doc.moveDown(0.4);
          continue;
        }

        doc
          .font("Helvetica")
          .fontSize(10.5)
          .fillColor("#222222")
          .text(line.replace(/[*_`]/g, ""), { lineGap: 4 });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function startPdfWorker() {
  if (worker) return;

  worker = new Worker(
    PDF_QUEUE,
    async (job: Job) => {
      const data = job.data as PdfJobData;
      if (!data.text || !data.text.trim()) {
        throw new Error("No text provided for PDF generation");
      }

      const name = sanitizeFileName(data.fileName);
      const buffer = await renderMarkdownToPdf(data.text);

      const orgId = data.organizationId;
      const key = orgId ? `${orgId}/${name}` : name;
      await uploadToR2(buffer, key, "application/pdf", ["compiled"]);

      if (orgId && data.userId) {
        await prisma.document.create({
          data: {
            id: crypto.randomUUID(),
            key,
            name,
            type: "PDF",
            size: buffer.byteLength,
            tags: JSON.stringify(["compiled"]),
            organizationId: orgId,
            userId: data.userId,
          },
        });
      }

      return {
        doc: {
          key,
          name,
          type: "pdf",
          size: buffer.byteLength,
        },
      } satisfies PdfJobResult;
    },
    {
      connection: redis,
      concurrency: 2,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`PDF job ${job?.id} failed:`, err);
  });

  worker.on("completed", (job) => {
    console.log(`PDF job ${job.id} completed`);
  });
}