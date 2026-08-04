"use client";

import { useState, useRef, useCallback } from "react";
import { useNotifications } from "@/app/context/notification-context";

interface SelectedFile {
  id: string;
  name: string;
  size: string;
  type: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function detectType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOCX";
  if (ext === "jpg" || ext === "jpeg") return "JPEG";
  if (ext === "png") return "PNG";
  return "FILE";
}

export default function CompilePage() {
  const { addNotification } = useNotifications();
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [compiling, setCompiling] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid = Array.from(newFiles);
    if (valid.length === 0) return;

    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const fresh = valid.filter((f) => !existingNames.has(f.name));
      const added = fresh.map((f) => ({
        id: `file-${Date.now()}-${idCounter.current++}`,
        name: f.name,
        size: formatSize(f.size),
        type: detectType(f.name),
      }));
      return [...prev, ...added];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
  }, []);

  const compile = useCallback(() => {
    if (files.length === 0) return;
    setCompiling(true);
    setTimeout(() => {
      setCompiling(false);
      addNotification({
        type: "success",
        title: "Compilation Complete",
        message: `Merged ${files.length} document${files.length > 1 ? "s" : ""} into a single file.`,
        action: { label: "View Result", href: "/dashboard/documents" },
      });
    }, 2000);
  }, [files.length, addNotification]);

  return (
    <div className="mx-auto w-full px-3 py-6 sm:py-8 sm:px-4">
      <h1 className="text-2xl font-bold text-deep sm:text-3xl">
        Compile Documents
      </h1>
      <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
        Upload multiple documents to merge their contents into a single file.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
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
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors sm:p-12 ${
              dragOver
                ? "border-blue bg-blue/5"
                : "border-gray-300 hover:border-gold/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
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
                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
              />
            </svg>
            <p className="text-center text-sm text-ink-muted">
              <span className="font-medium text-deep">Tap to upload</span> or
              drag and drop
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              PDF, DOCX, or images — select multiple files
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-surface p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-deep">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
                <button
                  onClick={reset}
                  className="text-xs text-ink-muted underline hover:text-deep"
                >
                  Clear all
                </button>
              </div>
              <ul className="space-y-1.5">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                        {f.type}
                      </span>
                      <span className="truncate text-sm text-deep">
                        {f.name}
                      </span>
                      <span className="shrink-0 text-xs text-ink-muted">
                        {f.size}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="shrink-0 text-ink-muted transition-colors hover:text-red-600"
                      aria-label={`Remove ${f.name}`}
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
                  </li>
                ))}
              </ul>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4">
              <button
                onClick={compile}
                disabled={compiling}
                className="w-full rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-50 sm:w-auto"
              >
                {compiling ? "Compiling..." : "Compile Documents"}
              </button>
            </div>
          )}
        </div>

        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-200 p-8">
          {compiling ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gold" />
              <p className="text-sm text-ink-muted">
                Compiling {files.length} document{files.length > 1 ? "s" : ""}...
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-ink-muted">
              {files.length > 0
                ? "Ready to compile. Press the button to merge your documents."
                : "Upload documents on the left to compile them into a single file."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
