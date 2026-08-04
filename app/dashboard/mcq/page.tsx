"use client";

import { useState, useRef, useCallback } from "react";
import SelectedFileList from "@/app/components/selected-file-list";

interface McqQuestion {
  q: string;
  options: string[];
  answer: number;
}

export default function MCQPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const inputRef = useRef<HTMLInputElement>(null);

  const score = Object.entries(selected).filter(
    ([i, v]) => questions[Number(i)]?.answer === v,
  ).length;

  const handleFiles = (newFiles: FileList) => {
    const docs = Array.from(newFiles);
    if (docs.length === 0) return;
    setFiles(docs);
    setSelected({});
    setQuestions([]);
    setError(null);
  };

  const generate = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("count", String(questionCount));
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/mcq", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setQuestions(data.questions ?? []);
      setSelected({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [files, questionCount]);

  const reset = useCallback(() => {
    setFiles([]);
    setQuestions([]);
    setSelected({});
    setError(null);
    setDragOver(false);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setQuestions([]);
    setSelected({});
    setError(null);
  }, []);

  return (
    <div className="mx-auto w-full px-3 py-6 sm:py-8 sm:px-4">
      <h1 className="text-2xl font-bold text-deep sm:text-3xl">
        MCQ Generator
      </h1>
      <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
        Upload documents to generate practice multiple-choice questions.
      </p>

      <div className="mt-6 grid gap-6">
        <div>
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
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            {files.length > 0 ? (
              <div className="flex flex-col items-center gap-3">
                <SelectedFileList files={files} />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                    className="rounded-lg border border-gray-300 bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-gold/50 hover:text-deep"
                  >
                    Change files
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFiles();
                    }}
                    className="rounded-lg border border-gray-300 bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    Clear
                  </button>
                </div>
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
                  Images, PDFs, or DOCX
                </p>
              </>
            )}
          </div>

          {files.length > 0 && !loading && questions.length === 0 && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-muted">Questions:</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-surface px-3 py-1.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                >
                  {[3, 5, 8, 10, 15].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={generate}
                className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
              >
                Generate MCQs
              </button>
            </div>
          )}

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gold" />
              <span className="text-sm text-ink-muted">
                Generating questions...
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div>
          {questions.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-ink-muted">
                  Score:{" "}
                  <span className="font-semibold text-deep">
                    {score}/{questions.length}
                  </span>
                </p>
                <div className="flex items-center gap-3">
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-surface px-2 py-1 text-xs outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                  >
                    {[3, 5, 8, 10, 15].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={generate}
                    disabled={loading}
                    className="text-xs text-ink-muted underline hover:text-deep disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={reset}
                    className="text-sm text-ink-muted underline hover:text-deep"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-5">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 bg-surface p-4 sm:p-5"
                  >
                    <p className="mb-3 text-sm font-medium text-deep sm:text-base">
                      {i + 1}. {q.q}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, j) => {
                        const isSelected = selected[i] === j;
                        const isCorrect = q.answer === j;
                        const showResult = selected[i] !== undefined;
                        let className =
                          "flex w-full items-center rounded-lg border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 ";
                        if (showResult && isCorrect) {
                          className +=
                            "border-green-400 bg-green-50 text-green-800";
                        } else if (showResult && isSelected && !isCorrect) {
                          className += "border-red-400 bg-red-50 text-red-800";
                        } else if (isSelected) {
                          className += "border-blue bg-blue/5 text-deep";
                        } else {
                          className +=
                            "border-gray-200 text-ink-muted hover:border-gray-300";
                        }
                        return (
                          <button
                            key={j}
                            disabled={showResult}
                            onClick={() =>
                              setSelected((prev) => ({ ...prev, [i]: j }))
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
                ))}
              </div>
            </div>
          )}

          {!loading && questions.length === 0 && files.length === 0 && (
            <div className="flex h-full min-h-50 items-center justify-center rounded-xl border border-dashed border-gray-200 p-8">
              <p className="text-center text-sm text-ink-muted">
                Upload documents to generate MCQs
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
