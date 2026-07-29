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
  submitFileOcr: (file: File, label?: string) => Promise<string>;
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
                success("OCR Complete", job.label || "Text extraction finished");
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
    async (file: File, label?: string): Promise<string> => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      const jobId = data.jobId;
      updateJob(jobId, { status: "pending", label: label || "Image OCR" });

      const nid = addNotification({
        type: "loading",
        title: "OCR in Progress",
        message: label || "Image OCR",
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
        success("OCR Complete (cached)", label || "Document OCR");
        return { jobId: null, cachedResult: data.result };
      }

      const jobId = data.jobId;
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
    [updateJob, addNotification, success],
  );

  return (
    <OcrContext.Provider value={{ jobs, submitFileOcr, submitDocumentOcr }}>
      {children}
    </OcrContext.Provider>
  );
}
