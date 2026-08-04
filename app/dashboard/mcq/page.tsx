"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import SelectedFileList from "@/app/components/selected-file-list";

interface McqQuestion {
  q: string;
  options: string[];
  answer: number;
}

interface StoredDoc {
  id: string;
  name: string;
  type: string;
}

export default function MCQPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [storedDocs, setStoredDocs] = useState<StoredDoc[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [pickKey, setPickKey] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [questionCount, setQuestionCount] = useState(20);
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const pageQuestions = questions.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const score = Object.entries(selected).filter(
    ([i, v]) => questions[Number(i)]?.answer === v,
  ).length;

  const answeredCount = Object.keys(selected).length;

  const hasInput = files.length > 0 || selectedKeys.length > 0;

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => {
        if (data.docs) {
          setStoredDocs(
            data.docs.map((d: { id: string; name: string; type: string }) => ({
              id: d.id,
              name: d.name,
              type: d.type,
            })),
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoadingDocs(false));
  }, []);

  const addKey = useCallback(() => {
    if (pickKey && !selectedKeys.includes(pickKey)) {
      setSelectedKeys((prev) => [...prev, pickKey]);
    }
    setPickKey("");
  }, [pickKey, selectedKeys]);

  const removeKey = useCallback((key: string) => {
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  }, []);

  const handleFiles = (newFiles: FileList) => {
    const docs = Array.from(newFiles);
    if (docs.length === 0) return;
    setFiles(docs);
    setSelected({});
    setQuestions([]);
    setError(null);
  };

  const generate = useCallback(async () => {
    if (!hasInput) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("count", String(questionCount));
      files.forEach((f) => formData.append("files", f));
      selectedKeys.forEach((k) => formData.append("keys", k));

      const res = await fetch("/api/mcq", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setQuestions(data.questions ?? []);
      setSelected({});
      setPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [files, selectedKeys, questionCount, hasInput]);

  const reset = useCallback(() => {
    setFiles([]);
    setSelectedKeys([]);
    setQuestions([]);
    setSelected({});
    setError(null);
    setDragOver(false);
    setPage(0);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setQuestions([]);
    setSelected({});
    setError(null);
    setPage(0);
  }, []);

  return (
    <div className="mx-auto px-3 py-6 sm:py-8 sm:px-4">
      <h1 className="text-2xl font-bold text-deep sm:text-3xl">
        MCQ Generator
      </h1>
      <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
        Upload documents to generate practice multiple-choice questions.
      </p>

      <div className="mt-6 grid gap-6">
        <div>
          <p className="mb-2 text-sm font-semibold text-deep">
            Select from your documents
          </p>
          {loadingDocs ? (
            <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-surface p-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gold" />
            </div>
          ) : storedDocs.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-surface p-4 text-center text-xs text-ink-muted">
              No stored documents found.
            </p>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={pickKey}
                  onChange={(e) => setPickKey(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                >
                  <option value="">Select a document...</option>
                  {storedDocs
                    .filter((d) => !selectedKeys.includes(d.id))
                    .map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={addKey}
                  disabled={!pickKey}
                  className="shrink-0 rounded-lg border border-gray-300 bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-gold/50 hover:text-deep disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add
                </button>
              </div>
              {selectedKeys.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {selectedKeys.map((key) => {
                    const doc = storedDocs.find((d) => d.id === key);
                    return (
                      <li key={key}>
                        <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-surface px-3 py-2">
                          <span className="min-w-0 flex-1 truncate text-sm text-deep">
                            {doc?.name ?? key}
                          </span>
                          <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
                            {doc?.type ?? "FILE"}
                          </span>
                          <button
                            onClick={() => removeKey(key)}
                            className="shrink-0 rounded-md p-1 text-ink-muted transition-colors hover:bg-gray-100 hover:text-red-600"
                            aria-label={`Remove ${doc?.name ?? key}`}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18 18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <p className="mt-5 mb-2 text-sm font-semibold text-deep">
            Or upload local files
          </p>
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
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 transition-colors sm:p-8 ${
              dragOver
                ? "border-blue bg-blue/5"
                : "border-gray-300 hover:border-gold/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.ppt,.pptx"
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
                  PPTs, PDFs, or DOCX
                </p>
              </>
            )}
          </div>

          {hasInput && !loading && questions.length === 0 && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-muted">Questions:</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-surface px-3 py-1.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                >
                  {[20, 40, 60, 80].map((n) => (
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
                <div className="flex items-center gap-3">
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-surface px-2 py-1 text-xs outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                  >
                    {[20, 40, 60, 80].map((n) => (
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
                            className +=
                              "border-green-400 bg-green-50 text-green-800";
                          } else if (showResult && isSelected && !isCorrect) {
                            className +=
                              "border-red-400 bg-red-50 text-red-800";
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
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="rounded-lg border border-gray-300 bg-surface px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-gold/50 hover:text-deep disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && questions.length === 0 && !hasInput && (
            <div className="flex h-full min-h-50 items-center justify-center rounded-xl border border-dashed border-gray-200 p-8">
              <p className="text-center text-sm text-ink-muted">
                Upload or select documents to generate MCQs
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
