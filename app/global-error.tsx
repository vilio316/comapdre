"use client";

import ErrorState from "@/app/components/error-state";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="m-0 bg-muted">
        <ErrorState error={error} retry={unstable_retry} />
      </body>
    </html>
  );
}
