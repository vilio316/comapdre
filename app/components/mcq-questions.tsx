"use client";

import { useState } from "react";

export interface McqQuestion {
  q: string;
  options: string[];
  answer: number;
}

const PAGE_SIZE = 10;

export default function McqQuestions({
  questions,
}: {
  questions: McqQuestion[];
}) {
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const pageQuestions = questions.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const score = Object.entries(selected).filter(
    ([i, v]) => questions[Number(i)]?.answer === v,
  ).length;

  const answeredCount = Object.keys(selected).length;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          Answered:{" "}
          <span className="font-semibold text-deep">
            {answeredCount}/{questions.length}
          </span>
          <span className="mx-2 text-gray-300">|</span>
          Score:{" "}
          <span className="font-semibold text-deep">
            {score}/{questions.length}
          </span>
        </p>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {pageQuestions.map((q, i) => {
          const idx = page * PAGE_SIZE + i;
          return (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 bg-surface p-4 sm:p-5"
            >
              <p className="mb-3 text-sm font-medium text-deep sm:text-base">
                {idx + 1}. {q.q}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, j) => {
                  const isSelected = selected[idx] === j;
                  const isCorrect = q.answer === j;
                  const showResult = selected[idx] !== undefined;
                  let className =
                    "flex w-full items-center rounded-lg border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 ";
                  if (showResult && isCorrect) {
                    className += "border-green-400 bg-green-50 text-green-800";
                  } else if (showResult && isSelected && !isCorrect) {
                    className += "border-red-400 bg-red-50 text-red-800";
                  } else if (isSelected) {
                    className += "border-blue bg-blue/5 text-deep";
                  } else {
                    className += "border-gray-200 text-ink-muted hover:border-gray-300";
                  }
                  return (
                    <button
                      key={j}
                      disabled={showResult}
                      onClick={() =>
                        setSelected((prev) => ({
                          ...prev,
                          [idx]: j,
                        }))
                      }
                      className={className}
                    >
                      <span className="mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                        {String.fromCharCode(65 + j)}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-gray-300 bg-surface px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-gold/50 hover:text-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            &larr; Previous
          </button>
          <p className="text-xs text-ink-muted">
            Page {page + 1} of {totalPages}
          </p>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-gray-300 bg-surface px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-gold/50 hover:text-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
