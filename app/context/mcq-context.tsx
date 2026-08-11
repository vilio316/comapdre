"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useNotifications } from "./notification-context";

export interface McqJobState {
  status: "pending" | "processing" | "done" | "failed";
  resultKey?: string;
  error?: string;
  label?: string;
}

export interface McqSubmitResult {
  jobId?: string;
  resultKey?: string;
  cached?: boolean;
}

interface McqContextValue {
  jobs: Record<string, McqJobState>;
  submitMcq: (
    files: File[],
    keys: string[],
    count: number,
    label?: string,
  ) => Promise<McqSubmitResult>;
}

const McqContext = createContext<McqContextValue | null>(null);

export function useMcq() {
  const ctx = useContext(McqContext);
  if (!ctx) throw new Error("useMcq must be used within McqProvider");
  return ctx;
}

const ACTIVE_JOBS_KEY = "compadre:mcq-active-jobs";

interface StoredMcqJob {
  jobId: string;
  label?: string;
  resultKey?: string;
}

function loadStoredJobs(): StoredMcqJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACTIVE_JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredJobs(jobs: StoredMcqJob[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_JOBS_KEY, JSON.stringify(jobs));
  } catch {
    // storage unavailable
  }
}

function forgetStoredJob(jobId: string) {
  saveStoredJobs(loadStoredJobs().filter((j) => j.jobId !== jobId));
}

export function McqProvider({ children }: { children: React.ReactNode }) {
  const { addNotification, removeNotification } = useNotifications();
  const [jobs, setJobs] = useState<Record<string, McqJobState>>({});
  const notifIds = useRef<Map<string, string>>(new Map());
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateJob = useCallback((jobId: string, state: McqJobState) => {
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
              const res = await fetch(`/api/mcq/status/${jobId}`);
              if (res.status === 404) {
                forgetStoredJob(jobId);
                removeJob(jobId);
                return;
              }
              if (!res.ok) return;
              const data = await res.json();

              if (data.status === "done") {
                const resultKey = data.resultKey || job.resultKey;
                next[jobId] = {
                  status: "done",
                  resultKey,
                  label: job.label,
                };
                const nid = notifIds.current.get(jobId);
                if (nid) {
                  removeNotification(nid);
                  notifIds.current.delete(jobId);
                }
                if (resultKey) {
                  addNotification({
                    type: "success",
                    title: "MCQs Ready",
                    message: job.label || "Question generation finished",
                    action: {
                      label: "View Questions",
                      href: `/dashboard/mcq/result/${encodeURIComponent(resultKey)}`,
                    },
                  });
                }
                forgetStoredJob(jobId);
              } else if (data.status === "failed") {
                next[jobId] = {
                  status: "failed",
                  error: data.error,
                  label: job.label,
                };
                const nid = notifIds.current.get(jobId);
                if (nid) {
                  removeNotification(nid);
                  notifIds.current.delete(jobId);
                }
                addNotification({
                  type: "error",
                  title: "MCQ Generation Failed",
                  message: data.error || "Unknown error",
                });
                forgetStoredJob(jobId);
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
  }, [addNotification, removeNotification, removeJob]);

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

  useEffect(() => {
    const stored = loadStoredJobs();
    if (stored.length === 0) return;
    setJobs((prev) => {
      const next = { ...prev };
      for (const s of stored) {
        if (!next[s.jobId]) {
          next[s.jobId] = { status: "pending", label: s.label, resultKey: s.resultKey };
        }
      }
      return next;
    });
  }, []);

  const submitMcq = useCallback(
    async (
      files: File[],
      keys: string[],
      count: number,
      label?: string,
    ): Promise<McqSubmitResult> => {
      const formData = new FormData();
      formData.append("count", String(count));
      files.forEach((f) => formData.append("files", f));
      keys.forEach((k) => formData.append("keys", k));

      const res = await fetch("/api/mcq", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      if (data.cached) {
        addNotification({
          type: "success",
          title: "MCQs Ready (cached)",
          message: label || "Question generation",
          action: {
            label: "View Questions",
            href: `/dashboard/mcq/result/${encodeURIComponent(data.resultKey)}`,
          },
        });
        return { resultKey: data.resultKey, cached: true };
      }

      const jobId = data.jobId;
      const fileLabel = label || (files.length === 1 ? "MCQ generation" : `${files.length} documents`);
      updateJob(jobId, { status: "pending", resultKey: data.resultKey, label: fileLabel });
      saveStoredJobs([
        ...loadStoredJobs().filter((j) => j.jobId !== jobId),
        { jobId, label: fileLabel, resultKey: data.resultKey },
      ]);

      const nid = addNotification({
        type: "loading",
        title: "Generating MCQs",
        message: fileLabel,
        duration: 0,
      });
      notifIds.current.set(jobId, nid);

      return { jobId, resultKey: data.resultKey };
    },
    [updateJob, addNotification],
  );

  return (
    <McqContext.Provider value={{ jobs, submitMcq }}>
      {children}
    </McqContext.Provider>
  );
}
