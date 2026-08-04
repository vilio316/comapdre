"use client";

import { useState, useRef } from "react";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
const MAX_SIZE = 30 * 1024 * 1024;

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  rawBytes: number;
}

interface UploadPipelineProps {
  onComplete: (file: UploadedFile, tags: string[]) => void;
  onCancel: () => void;
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

function validateFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext))
    return "Only PDF, DOCX, and image files are accepted.";
  if (file.size > MAX_SIZE) return "File exceeds the 30 MB limit.";
  return null;
}

export default function UploadPipeline({
  onComplete,
  onCancel,
}: UploadPipelineProps) {
  const [step, setStep] = useState<"select" | "uploading" | "done">("select");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
    setFileName(f.name);
  };

  const startUpload = async () => {
    if (!file) return;

    const renamed = new File([file], fileName, { type: file.type });

    setStep("uploading");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", renamed);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || "Upload failed"));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      setFile(renamed);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("select");
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const finish = () => {
    if (!file) return;
    const uf: UploadedFile = {
      id: crypto.randomUUID(),
      name: file.name,
      size: formatSize(file.size),
      type: detectType(file.name),
      rawBytes: file.size,
    };
    onComplete(uf, tags);
  };

  const resetFile = () => {
    setFile(null);
    setFileName("");
    setError(null);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-deep">Upload Document</h3>
        <button
          onClick={onCancel}
          className="rounded-md p-1 text-ink-muted hover:bg-gray-100 hover:text-deep transition-colors"
        >
          <svg
            className="h-5 w-5"
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

      <div className="p-5">
        {step === "select" && (
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
                pick(e.dataTransfer.files[0]);
              }}
              onClick={() => !file && inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? "border-blue bg-blue/5"
                  : error
                    ? "border-red-300 bg-red-50/30"
                    : "border-gray-300 hover:border-gold/50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pick(f);
                  e.target.value = "";
                }}
              />
              {file ? (
                <div
                  className="flex w-full items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-deep/5">
                    <svg
                      className="h-6 w-6 text-deep"
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-deep">
                      {fileName || file.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFile();
                    }}
                    className="rounded-md p-1 text-ink-muted hover:bg-gray-100 hover:text-red-500"
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
              ) : (
                <>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-deep/5">
                    <svg
                      className="h-5 w-5 text-deep"
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
                  </div>
                  <p className="text-sm text-ink-muted">
                    <span className="font-medium text-deep">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    PDF, DOCX, or image up to 30 MB
                  </p>
                </>
              )}
            </div>

            {file && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  File name
                </label>
                <input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />
              </div>
            )}

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                <svg
                  className="h-4 w-4 shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}

        {step === "uploading" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-deep/5">
                <svg
                  className="h-5 w-5 text-deep"
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-deep">
                  {file?.name}
                </p>
                <p className="text-xs text-ink-muted">
                  {file && formatSize(file.size)}
                </p>
              </div>
              <span className="text-xs font-medium text-deep">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-deep transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-ink-muted">
              {progress < 100
                ? "Uploading and processing..."
                : "Processing complete"}
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-4 w-4 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-800">
                  Uploaded successfully
                </p>
                <p className="truncate text-xs text-green-600">{file?.name}</p>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                Add tags
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold"
                  >
                    {t}
                    <button
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-gold/60 hover:text-gold"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Type a tag and press Enter"
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />
                <button
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "select" && file && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={startUpload}
              className="flex-1 rounded-lg bg-gold py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
            >
              Upload
            </button>
            <button
              onClick={resetFile}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={finish}
              className="flex-1 rounded-lg bg-gold py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
            >
              Done
            </button>
            <button
              onClick={() => {
                setStep("select");
                resetFile();
                setProgress(0);
                setTags([]);
                setTagInput("");
              }}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-gray-50"
            >
              Upload another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export type { UploadedFile };
