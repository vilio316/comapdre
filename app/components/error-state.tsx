"use client";

import Link from "next/link";
import { FaTriangleExclamation } from "react-icons/fa6";
import { classifyError } from "@/app/lib/error-classify";

interface ErrorStateProps {
  error: Error & { digest?: string };
  retry?: () => void;
  context?: string;
}

export default function ErrorState({ error, retry, context }: ErrorStateProps) {
  const { title, message } = classifyError(error, context);
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-surface p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
          <FaTriangleExclamation className="h-6 w-6" />
        </div>

        <h1 className="text-xl font-bold text-deep">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{message}</p>

        {error?.digest && !isProduction && (
          <p className="mt-3 font-mono text-xs text-ink-muted">
            Digest: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {retry && (
            <button
              onClick={retry}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
            >
              Try again
            </button>
          )}
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-gray-50 hover:text-deep"
          >
            Back to dashboard
          </Link>
        </div>

        {!isProduction && error?.stack && (
          <details className="mt-6 rounded-lg border border-gray-200 bg-muted p-3 text-left">
            <summary className="cursor-pointer text-xs font-medium text-ink-muted">
              Technical details (development only)
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-muted">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}