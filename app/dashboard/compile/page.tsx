"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useNotifications } from "@/app/context/notification-context";

interface StoredDoc {
  id: string;
  name: string;
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
  if (ext === "ppt") return "PPT";
  if (ext === "pptx") return "PPTX";
  if (ext === "jpg" || ext === "jpeg") return "JPEG";
  if (ext === "png") return "PNG";
  return "FILE";
}

export default function CompilePage() {
  const { addNotification, requestSystemNotifications, notifySystem } =
    useNotifications();
  const [files, setFiles] = useState<File[]>([]);
  const [storedDocs, setStoredDocs] = useState<StoredDoc[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [pickKey, setPickKey] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [compiling, setCompiling] = useState(false);
  const [compileJobId, setCompileJobId] = useState<string | null>(null);
  const [compileStatus, setCompileStatus] = useState<
    "processing" | "done" | "failed"
  >("processing");
  const [output, setOutput] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);

  const [pdfJobId, setPdfJobId] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<"idle" | "processing" | "done" | "failed">(
    "idle",
  );
  const [pdfDoc, setPdfDoc] = useState<{ key: string; name: string } | null>(
    null,
  );

  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasInput = files.length > 0 || selectedKeys.length > 0;
  const totalInputs = files.length + selectedKeys.length;
  const previewReady = output !== null && compileStatus === "done";

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

  useEffect(() => {
    if (!compileJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/compile/status/${compileJobId}`);
        const data = await res.json();
        if (data.status === "done" && data.result) {
          clearInterval(interval);
          setCompileStatus("done");
          setCompiling(false);
          setOutput(data.result.text ?? "");
          setSources(data.result.sources ?? []);
          setFileName(defaultFileName(data.result.sources ?? []));
        } else if (data.status === "failed") {
          clearInterval(interval);
          setCompileStatus("failed");
          setCompiling(false);
          setError(data.error ?? "Compilation failed");
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [compileJobId]);

  useEffect(() => {
    if (!pdfJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/compile/pdf/status/${pdfJobId}`);
        const data = await res.json();
        if (data.status === "done" && data.result?.doc) {
          clearInterval(interval);
          setPdfStatus("done");
          setPdfDoc(data.result.doc);
          addNotification({
            type: "success",
            title: "PDF Created",
            message: `${data.result.doc.name} has been saved to your documents.`,
            action: {
              label: "View PDF",
              href: `/dashboard/documents/${encodeURIComponent(data.result.doc.key)}`,
            },
          });
          notifySystem(
            "Compilation Complete",
            `${data.result.doc.name} has been saved as a PDF.`,
            `/dashboard/documents/${encodeURIComponent(data.result.doc.key)}`,
          );
        } else if (data.status === "failed") {
          clearInterval(interval);
          setPdfStatus("failed");
          setError(data.error ?? "PDF generation failed");
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pdfJobId, addNotification, notifySystem]);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid = Array.from(newFiles);
    if (valid.length === 0) return;

    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const fresh = valid.filter((f) => !existingNames.has(f.name));
      return [...prev, ...fresh];
    });
  }, []);

  const removeFile = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
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

  const reset = useCallback(() => {
    setFiles([]);
    setSelectedKeys([]);
    setCompiling(false);
    setCompileJobId(null);
    setCompileStatus("processing");
    setOutput(null);
    setSources([]);
    setPdfJobId(null);
    setPdfStatus("idle");
    setPdfDoc(null);
    setFileName("");
    setError(null);
    setCopied(false);
    setDragOver(false);
  }, []);

  const compile = useCallback(async () => {
    if (!hasInput || compiling) return;
    requestSystemNotifications();
    setCompiling(true);
    setCompileStatus("processing");
    setError(null);
    setOutput(null);
    setSources([]);
    setPdfJobId(null);
    setPdfStatus("idle");
    setPdfDoc(null);
    setCopied(false);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      selectedKeys.forEach((k) => formData.append("keys", k));

      const res = await fetch("/api/compile", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Compilation failed");
      if (!data.jobId) throw new Error("No job ID returned");
      setCompileJobId(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compilation failed");
      setCompiling(false);
    }
  }, [files, selectedKeys, hasInput, compiling, requestSystemNotifications]);

  const saveAsPdf = useCallback(async () => {
    if (!output || !output.trim() || pdfStatus === "processing") return;
    requestSystemNotifications();
    setPdfStatus("processing");
    setPdfDoc(null);
    setError(null);
    try {
      const res = await fetch("/api/compile/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: output, fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PDF generation failed");
      if (!data.jobId) throw new Error("No job ID returned");
      setPdfJobId(data.jobId);
    } catch (err) {
      setPdfStatus("failed");
      setError(err instanceof Error ? err.message : "PDF generation failed");
    }
  }, [output, fileName, pdfStatus, requestSystemNotifications]);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }, [output]);

  return (
    <div className="mx-auto w-full px-3 py-6 sm:py-8 sm:px-4">
      <h1 className="text-2xl font-bold text-deep sm:text-3xl">
        Compile Documents
      </h1>
      <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
        OCR-read your documents, unify their contents, and save the result as a
        PDF.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
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
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors sm:p-8 ${
              dragOver
                ? "border-blue bg-blue/5"
                : "border-gray-300 hover:border-gold/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
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
                  onClick={() => setFiles([])}
                  className="text-xs text-ink-muted underline hover:text-deep"
                >
                  Clear all
                </button>
              </div>
              <ul className="space-y-1.5">
                {files.map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                        {detectType(f.name)}
                      </span>
                      <span className="truncate text-sm text-deep">
                        {f.name}
                      </span>
                      <span className="shrink-0 text-xs text-ink-muted">
                        {formatSize(f.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(f.name)}
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

          {hasInput && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={compile}
                disabled={compiling}
                className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-50"
              >
                {compiling ? "Compiling..." : "Compile Documents"}
              </button>
              <button
                onClick={reset}
                className="rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm text-ink-muted transition-colors hover:border-red-300 hover:text-red-600"
              >
                Reset
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex min-h-[200px] flex-col rounded-xl border border-gray-200 bg-surface p-4 sm:p-5">
          {compiling && compileStatus === "processing" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gold" />
              <p className="text-sm text-ink-muted">
                Reading {totalInputs} document{totalInputs > 1 ? "s" : ""} with
                OCR in the background...
              </p>
            </div>
          ) : pdfJobId && pdfStatus === "processing" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gold" />
              <p className="text-sm text-ink-muted">
                Rendering your document as a PDF...
              </p>
            </div>
          ) : previewReady ? (
            <div className="flex flex-1 flex-col">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-deep">Preview</p>
                <button
                  onClick={copyOutput}
                  className="rounded-lg border border-gray-300 bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-gold/50 hover:text-deep"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              {sources.length > 0 && (
                <p className="mb-3 text-xs text-ink-muted">
                  Sources: {sources.join(", ")}
                </p>
              )}
              <pre className="max-h-[45vh] flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed text-ink">
                {output}
              </pre>

              {pdfDoc ? (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-700">
                    PDF saved to your documents.
                  </p>
                  <Link
                    href={`/dashboard/documents/${encodeURIComponent(pdfDoc.key)}`}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
                  >
                    View PDF
                  </Link>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                  <label
                    htmlFor="pdf-name"
                    className="mb-1.5 block text-xs font-semibold text-deep"
                  >
                    Document name
                  </label>
                  <input
                    id="pdf-name"
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g. Research compilation"
                    className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                  />
                  <button
                    onClick={saveAsPdf}
                    className="mt-3 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-50"
                  >
                    Save as PDF
                  </button>
                  <p className="mt-2 text-xs text-ink-muted">
                    Your compiled document will be rendered as a PDF and saved
                    to the Documents panel.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-center text-sm text-ink-muted">
                {hasInput
                  ? "Ready to compile. The extracted text will appear here."
                  : "Select stored documents or upload local files to unify their contents."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function defaultFileName(sources: string[]): string {
  if (sources.length === 0) return "";
  if (sources.length === 1) {
    const base = sources[0]
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
    return base || "Compiled document";
  }
  return `Compiled document (${sources.length} sources)`;
}
