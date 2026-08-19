"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useOcr } from "@/app/context/ocr-context";
import { FaArrowLeft, FaCamera, FaDownload, FaFile } from "react-icons/fa6";
import type { DocumentViewerData } from "@/app/lib/documents";

export default function DocumentViewer({
  docId,
  initialData,
}: {
  docId: string;
  initialData: DocumentViewerData;
}) {
  const { jobs, submitDocumentOcr } = useOcr();
  const router = useRouter();
  const data = initialData;

  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cachedOcrText, setCachedOcrText] = useState<string | null>(null);

  const job = jobId ? jobs[jobId] : null;
  const ocrText = cachedOcrText ?? (job?.status === "done" ? job.result : null);
  const isProcessing =
    job && (job.status === "pending" || job.status === "processing");

  const isImage = data.type === "jpeg" || data.type === "png";
  const isDocument = data.type === "pdf" || data.type === "docx";
  const canScan = isImage || isDocument;

  const scanOcr = useCallback(async () => {
    if (!data || !canScan) return;
    setSubmitting(true);
    try {
      const { jobId: jId, cachedResult } = await submitDocumentOcr(
        docId,
        data.name,
      );
      if (cachedResult) {
        setCachedOcrText(cachedResult);
      } else if (jId) {
        setJobId(jId);
      }
    } catch {
      // error handled by context
    } finally {
      setSubmitting(false);
    }
  }, [data, canScan, docId, submitDocumentOcr]);

  const buttonDisabled = submitting || isProcessing || !!ocrText;

  return (
    <div className="flex flex-col pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-1 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-deep transition-colors"
          >
            <FaArrowLeft />
            Back
          </button>
          <h1 className="truncate text-lg font-bold text-deep sm:text-xl">
            {data.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canScan && (
            <button
              onClick={scanOcr}
              disabled={buttonDisabled}
              className="flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-50"
            >
              <FaCamera />
              {submitting
                ? "Submitting..."
                : isProcessing
                  ? "Processing..."
                  : ocrText
                    ? "Scanned"
                    : isDocument
                      ? "Scan Document"
                      : "OCR Scan"}
            </button>
          )}
          <a
            href={data.url}
            download={data.name}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50 hover:text-deep"
          >
            <FaDownload />
            Download
          </a>
        </div>
      </div>

      {data.type === "pdf" ? (
        <div className="flex flex-col gap-4">
          <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm">
            <iframe
              src={data.url}
              className="h-[80vh] w-full"
              title={data.name}
            />
          </div>
          {ocrText && (
            <div className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-deep">
                Extracted Text
              </h2>
              <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">
                {ocrText}
              </p>
            </div>
          )}
        </div>
      ) : isImage ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-center rounded-xl border border-gray-200 bg-surface p-4 shadow-sm">
            <img
              src={data.url}
              alt={data.name}
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
          </div>
          {ocrText && (
            <div className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-deep">
                Extracted Text
              </h2>
              <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">
                {ocrText}
              </p>
            </div>
          )}
        </div>
      ) : data.type === "docx" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-gray-200 bg-surface p-10 shadow-sm">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-deep/5">
                <FaFile fill="blue" />
              </div>
              <h2 className="text-lg font-semibold text-deep">
                Preview not available
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                DOCX files cannot be previewed in the browser. Download the file
                to view it.
              </p>
              <a
                href={data.url}
                download={data.name}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
              >
                <FaDownload />
                Download
              </a>
            </div>
          </div>
          {ocrText && (
            <div className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-deep">
                Extracted Text
              </h2>
              <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">
                {ocrText}
              </p>
            </div>
          )}
        </div>
      ) : data.type === "md" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-deep">
              {data.name}
            </h2>
            <pre className="whitespace-pre-wrap text-sm text-ink leading-relaxed font-mono">
              {data.text ?? "No text content."}
            </pre>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-surface p-10 shadow-sm">
          <div className="mx-auto max-w-md text-center">
            <p className="text-sm text-ink-muted">
              This file type cannot be previewed.
            </p>
            <a
              href={data.url}
              download={data.name}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
            >
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}