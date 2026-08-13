"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import McqTabs from "@/app/components/mcq-tabs";

interface HistoryEntry {
  resultKey: string;
  keys: string[];
  count: number;
  createdAt: number;
}

function fileName(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

function formatDate(ts: number): string {
  if (!ts) return "Recently";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function McqHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/mcq/history")
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((res) => {
        if (!active) return;
        if (res.error) throw new Error(res.error);
        setHistory(res.history ?? []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto px-3 py-6 sm:py-8 sm:px-4">
      <h1 className="text-2xl font-bold text-deep sm:text-3xl">
        MCQ Generator
      </h1>
      <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
        Upload documents to generate practice multiple-choice questions.
      </p>

      <McqTabs />

      <div className="mt-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && history === null && (
          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-surface p-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gold" />
          </div>
        )}

        {!error && history !== null && history.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <svg
              className="mb-3 h-10 w-10 text-ink-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
              />
            </svg>
            <p className="text-sm font-medium text-deep">
              No generated tests yet
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Generate MCQs from your stored documents and they will appear
              here.
            </p>
            <Link
              href="/dashboard/mcq"
              className="mt-5 rounded-lg bg-gold px-5 py-2 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
            >
              Generate MCQs
            </Link>
          </div>
        )}

        {history !== null && history.length > 0 && (
          <ul className="space-y-3">
            {history.map((entry) => {
              const title =
                entry.keys.length > 0
                  ? fileName(entry.keys[0])
                  : "MCQ set";
              const extra =
                entry.keys.length > 1 ? ` +${entry.keys.length - 1} more` : "";
              return (
                <li key={entry.resultKey}>
                  <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-deep">
                        {title}
                        <span className="font-normal text-ink-muted">
                          {extra}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {entry.count} questions &middot; {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/mcq/result/${encodeURIComponent(entry.resultKey)}`}
                      className="shrink-0 rounded-lg bg-gold px-4 py-2 text-center text-xs font-medium text-deep transition-colors hover:bg-gold-light"
                    >
                      View Questions
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
