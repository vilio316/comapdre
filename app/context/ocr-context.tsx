"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useNotifications } from "./notification-context";

export interface OcrJobState {
  status: "pending" | "processing" | "done" | "failed";
  result?: string;
  error?: string;
  label?: string;
}

export interface OcrSubmitResult {
  jobId: string | null;
  cachedResult?: string;
}

interface OcrContextValue {
  jobs: Record<string, OcrJobState>;
  submitFileOcr: (files: File[], label?: string) => Promise<string>;
  submitDocumentOcr: (documentId: string, label?: string) => Promise<OcrSubmitResult>;
}

const OcrContext = createContext<OcrContextValue | null>(null);

export function useOcr() {
  const ctx = useContext(OcrContext);
  if (!ctx) throw new Error("useOcr must be used within OcrProvider");
  return ctx;
}

export function OcrProvider({ children }: { children: React.ReactNode }) {
  const { success, error, addNotification, removeNotification } = useNotifications();
  const [jobs, setJobs] = useState<Record<string, OcrJobState>>({});
  const notifIds = useRef<Map<string, string>>(new Map());
  const docIds = useRef<Map<string, string>>(new Map());
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateJob = useCallback((jobId: string, state: OcrJobState) => {
    setJobs((prev) => ({ ...prev, [jobId]: state }));
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  }, []);

  const pollOnce = useCallback(async () => {
    setJobs((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;

      const next = { ...prev };
      const promises: Promise<void>[] = [];

      for (const jobId of ids) {
        const job = next[jobId];
        if (job.status === "done" || job.status === "failed") continue;

        promises.push(
          (async () => {
            try {
              const res = await fetch(`/api/ocr/status/${jobId}`);
              if (!res.ok) return;
              const data = await res.json();

              if (data.status === "done") {
                next[jobId] = { status: "done", result: data.result, label: job.label };
                const nid = notifIds.current.get(jobId);
                if (nid) { removeNotification(nid); notifIds.current.delete(jobId); }
                const docId = docIds.current.get(jobId);
                addNotification({
                  type: "success",
                  title: "OCR Complete",
                  message: job.label || "Text extraction finished",
                  action: docId ? { label: "View Document", href: `/dashboard/documents/${encodeURIComponent(docId)}` } : undefined,
                });
                if (docId) docIds.current.delete(jobId);
              } else if (data.status === "failed") {
                next[jobId] = { status: "failed", error: data.error, label: job.label };
                const nid = notifIds.current.get(jobId);
                if (nid) { removeNotification(nid); notifIds.current.delete(jobId); }
                error("OCR Failed", data.error || "Unknown error");
              } else {
                next[jobId] = { ...job, status: data.status as "processing" };
              }
            } catch {
              // network error, retry next cycle
            }
          })(),
        );
      }

      if (promises.length > 0) {
        Promise.all(promises)
          .then(() => {
            const hasActive = Object.values(next).some(
              (j) => j.status !== "done" && j.status !== "failed",
            );
            if (!hasActive && pollTimer.current) {
              clearInterval(pollTimer.current);
              pollTimer.current = null;
            }
          })
          .catch(() => {});
      }

      return next;
    });
  }, [success, error, addNotification, removeNotification]);

  useEffect(() => {
    const activeCount = Object.values(jobs).filter(
      (j) => j.status !== "done" && j.status !== "failed",
    ).length;

    if (activeCount > 0 && !pollTimer.current) {
      pollTimer.current = setInterval(pollOnce, 2000);
    }
    if (activeCount === 0 && pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [jobs, pollOnce]);

  const submitFileOcr = useCallback(
    async (files: File[], label?: string): Promise<string> => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      const jobId = data.jobId;
      const fileLabel = files.length === 1 ? (label || "Image OCR") : `${files.length} images`;
      updateJob(jobId, { status: "pending", label: fileLabel });

      const nid = addNotification({
        type: "loading",
        title: "OCR in Progress",
        message: fileLabel,
        duration: 0,
      });
      notifIds.current.set(jobId, nid);

      return jobId;
    },
    [updateJob, addNotification],
  );

  const submitDocumentOcr = useCallback(
    async (documentId: string, label?: string): Promise<OcrSubmitResult> => {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/ocr`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      if (data.cached) {
        addNotification({
          type: "success",
          title: "OCR Complete (cached)",
          message: label || "Document OCR",
          action: { label: "View Document", href: `/dashboard/documents/${encodeURIComponent(documentId)}` },
        });
        return { jobId: null, cachedResult: data.result };
      }

      const jobId = data.jobId;
      docIds.current.set(jobId, documentId);
      updateJob(jobId, { status: "pending", label: label || "Document OCR" });

      const nid = addNotification({
        type: "loading",
        title: "OCR in Progress",
        message: label || "Document OCR",
        duration: 0,
      });
      notifIds.current.set(jobId, nid);

      return { jobId };
    },
    [updateJob, addNotification],
  );

  return (
    <OcrContext.Provider value={{ jobs, submitFileOcr, submitDocumentOcr }}>
      {children}
    </OcrContext.Provider>
  );
}
