export interface FriendlyError {
  title: string;
  message: string;
}

const CONTEXT_LABELS: Record<string, string> = {
  dashboard: "the dashboard",
  mcq: "the MCQ Generator",
  ocr: "the OCR Scanner",
  compile: "the Document Compiler",
  documents: "your Document Library",
};

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function classifyError(
  error: Error & { digest?: string },
  context?: string,
): FriendlyError {
  const label = CONTEXT_LABELS[context ?? ""] ?? context ?? "Compadre";
  const raw = (error?.message ?? "").toLowerCase();

  if (matchAny(raw, [/fetch failed/i, /failed to fetch/i, /network/i, /econn/i, /enotfound/i, /offline/i, /load failed/i, /timed ?out/i, /aborted/i])) {
    return {
      title: "Connection problem",
      message:
        "We couldn't reach the server. Check your internet connection and try again.",
    };
  }

  if (matchAny(raw, [/quota/i, /rate.?limit/i, /429/i, /resource_exhausted/i, /insufficient/i, /capacity/i, /busy/i])) {
    return {
      title: "AI service is busy",
      message:
        "The AI assistant is at capacity right now. Wait a moment and try again.",
    };
  }

  if (matchAny(raw, [/unauthorized/i, /401/i, /session/i, /sign ?in/i])) {
    return {
      title: "Please sign in again",
      message: `Your session has expired. Sign in to continue using ${label}.`,
    };
  }

  if (matchAny(raw, [/storage/i, /\br2\b/i, /\bs3\b/i, /\bbucket\b/i, /upload/i, /delete/i])) {
    return {
      title: "Storage trouble",
      message:
        "We couldn't access your stored documents. Try again in a moment.",
    };
  }

  if (matchAny(raw, [/\bjob\b/i, /queue/i, /worker/i, /redis/i, /processing/i, /compile/i])) {
    return {
      title: "Background processing issue",
      message: `${label} couldn't finish processing. Try again in a moment.`,
    };
  }

  if (matchAny(raw, [/not found/i, /404/i, /missing/i, /enoent/i])) {
    return {
      title: "Not found",
      message: "The item you're looking for doesn't exist or was removed.",
    };
  }

  if (matchAny(raw, [/invalid/i, /unsupported/i, /too large/i, /exceed/i])) {
    return {
      title: "Something's off with that input",
      message:
        "We couldn't process that input. Check the file or details and try again.",
    };
  }

  return {
    title: "Something went wrong",
    message: `An unexpected error happened while loading ${label}. Please try again.`,
  };
}
