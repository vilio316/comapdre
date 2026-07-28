"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function DocumentViewerPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/documents/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        setData(res);
        console.log(res);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-lg font-semibold text-deep">
          Could not load document
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {error ?? "Unknown error"}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-deep px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-deep-light"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-deep transition-colors"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Back
          </Link>
          <h1 className="truncate text-lg font-bold text-deep sm:text-xl">
            {data.name}
          </h1>
        </div>
        {data.type === "jpeg" ||
          (data.type === "png" && (
            <button
              onClick={async () =>
                await fetch(`/api/documents/${id}/ocr`, {
                  method: "POST",
                })
              }
            >
              OCR SCAN
            </button>
          ))}
        <a
          href={data.url}
          download={data.name}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50 hover:text-deep"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download
        </a>
      </div>
      {data.type === "pdf" ? (
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm">
          <iframe
            src={data.url}
            className="h-[80vh] w-full"
            title={data.name}
          />
        </div>
      ) : data.type === "jpeg" || data.type === "png" ? (
        <div className="flex items-start justify-center rounded-xl border border-gray-200 bg-surface p-4 shadow-sm">
          <img
            src={data.url}
            alt={data.name}
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
          />
        </div>
      ) : data.type === "docx" ? (
        <div className="rounded-xl border border-gray-200 bg-surface p-10 shadow-sm">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-deep/5">
              <svg
                className="h-7 w-7 text-deep"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
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
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-deep px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-deep-light"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              Download
            </a>
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-deep px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-deep-light"
            >
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
