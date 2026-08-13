"use client";

import ErrorState from "@/app/components/error-state";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorState error={error} retry={unstable_retry} context="ocr" />;
}
