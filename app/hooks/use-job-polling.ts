"use client";

import { useEffect, useRef, useCallback } from "react";
import { useNotifications } from "@/app/context/notification-context";

interface JobStatusResult {
  status: "pending" | "processing" | "done" | "failed";
  result?: string;
  error?: string;
}

interface UseJobPollingOptions {
  intervalMs?: number;
  onComplete?: (result: JobStatusResult) => void;
}

export function useJobPolling(jobId: string | null, options?: UseJobPollingOptions) {
  const { success, error, addNotification, removeNotification } = useNotifications();
  const loadingNotifId = useRef<string | null>(null);
  const intervalMs = options?.intervalMs ?? 2000;
  const onCompleteRef = useRef(options?.onComplete);
  onCompleteRef.current = options?.onComplete;

  const clearLoadingNotification = useCallback(() => {
    if (loadingNotifId.current) {
      removeNotification(loadingNotifId.current);
      loadingNotifId.current = null;
    }
  }, [removeNotification]);

  useEffect(() => {
    if (!jobId) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/ocr/status/${jobId}`);
        if (!res.ok) throw new Error("Polling failed");
        const data: JobStatusResult = await res.json();

        if (!active) return;

        if (data.status === "done") {
          clearLoadingNotification();
          success("OCR Complete", "Text extraction finished successfully");
          onCompleteRef.current?.(data);
          return;
        }

        if (data.status === "failed") {
          clearLoadingNotification();
          error("OCR Failed", data.error || "Unknown error");
          onCompleteRef.current?.(data);
          return;
        }

        if (!loadingNotifId.current) {
          loadingNotifId.current = addNotification({
            type: "loading",
            title: "OCR in Progress",
            message: "Extracting text from image...",
            duration: 0,
          });
        }

        if (active) {
          timeoutId = setTimeout(poll, intervalMs);
        }
      } catch {
        if (active) {
          timeoutId = setTimeout(poll, intervalMs);
        }
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      clearLoadingNotification();
    };
  }, [jobId, intervalMs, addNotification, success, error, clearLoadingNotification]);
}
