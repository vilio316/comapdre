import Link from "next/link";
import { FaFolderOpen } from "react-icons/fa6";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-surface p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
          <FaFolderOpen className="h-6 w-6" />
        </div>

        <p className="text-sm font-semibold text-gold">404</p>
        <h1 className="mt-1 text-xl font-bold text-deep">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          The page you are looking for does not exist or may have been moved.
        </p>

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
