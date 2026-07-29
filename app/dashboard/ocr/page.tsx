"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useOcr } from "@/app/context/ocr-context";

export default function OCRPage() {
  const { jobs, submitFileOcr } = useOcr();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const job = jobId ? jobs[jobId] : null;
  const text = job?.status === "done" ? (job.result ?? "") : "";
  const isProcessing = job && (job.status === "pending" || job.status === "processing");

  const submitOcr = useCallback(async () => {
    if (files.length === 0) return;
    setSubmitting(true);
    try {
      const label = files.length === 1 ? files[0].name : `${files.length} files`;
      const id = await submitFileOcr(files, label);
      setJobId(id);
    } catch {
      // error toast handled by context
    } finally {
      setSubmitting(false);
    }
  }, [files, submitFileOcr]);

  const handleFiles = (newFiles: FileList) => {
    const images = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setFiles(images);
    setJobId(null);
    const readers = images.map((f) => {
      return new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(f);
      });
    });
    Promise.all(readers).then(setPreviews);
  };

  const reset = useCallback(() => {
    setFiles([]);
    setPreviews([]);
    setJobId(null);
  }, []);

  return (
    <div className="mx-auto w-full px-3 py-6 sm:py-8 sm:px-4">
      <h1 className="text-2xl font-bold text-deep sm:text-3xl">OCR Scanner</h1>
      <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
        Upload an image to extract text — works with handwritten and printed
        documents.
      </p>

      <div className="md:grid-cols-2 gap-x-4 gap-y-2 grid">
        <div className={`mt-4 sm:mt-6 ${!text && "col-span-2"}`}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => files.length === 0 && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors sm:p-12 ${
              dragOver
                ? "border-blue bg-blue/5"
                : "border-gray-300 hover:border-gold/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) =>
                e.target.files && handleFiles(e.target.files)
              }
            />
            {previews.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {previews.map((src, i) => (
                  <Image
                    key={i}
                    src={src}
                    alt={`Uploaded ${i + 1}`}
                    width={160}
                    height={120}
                    className="h-24 w-auto rounded-lg object-contain"
                    unoptimized
                  />
                ))}
              </div>
            ) : (
              <>
                <svg
                  className="mb-3 h-8 w-8 text-ink-muted sm:h-10 sm:w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                <p className="text-center text-sm text-ink-muted">
                  <span className="font-medium text-deep">Tap to upload</span>{" "}
                  or drag and drop
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  PNG, JPG, WEBP — select multiple images
                </p>
              </>
            )}
          </div>

          {files.length > 0 && !isProcessing && !text && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                onClick={submitOcr}
                disabled={submitting}
                className="w-full rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-50 sm:w-auto"
              >
                {submitting ? "Submitting..." : `Scan ${files.length > 1 ? `(${files.length} images)` : "for Text"}`}
              </button>
              <button
                onClick={reset}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-ink-muted hover:bg-gray-50 sm:w-auto"
              >
                Remove
              </button>
            </div>
          )}
          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gold" />
              <span className="text-sm text-ink-muted">Processing in background...</span>
            </div>
          )}
          {text && (
            <div className="mt-4">
              <button
                onClick={reset}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-ink-muted hover:bg-gray-50"
              >
                New Scan
              </button>
            </div>
          )}
        </div>

        {text && (
          <div className="mt-6 sm:mt-8">
            <h2 className="mb-2 text-base font-semibold text-deep sm:mb-3 sm:text-lg">
              Extracted Text
            </h2>
            <div className="rounded-xl border border-gray-200 bg-surface p-4 sm:p-5">
              <p className="text-sm text-deep leading-relaxed whitespace-pre-wrap">
                {text}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
