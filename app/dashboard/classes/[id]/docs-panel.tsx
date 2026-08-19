"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaFile, FaArrowRight, FaTrash } from "react-icons/fa6";
import type { ClassDoc } from "@/app/lib/class-types";

export default function ClassDocsPanel({
  classId,
  initialDocs,
  canDelete,
}: {
  classId: string;
  initialDocs: ClassDoc[];
  canDelete: boolean;
}) {
  const router = useRouter();

  const [docs, setDocs] = useState<ClassDoc[]>(initialDocs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [docsError, setDocsError] = useState("");

  const handleDeleteDoc = async (doc: ClassDoc) => {
    if (!window.confirm(`Delete "${doc.name}" from this class?`)) return;
    setDeletingId(doc.id);
    setDocsError("");
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(doc.id)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setDocsError(body?.error ?? "Failed to delete document");
        return;
      }
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      router.refresh();
    } catch {
      setDocsError("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-deep">
          <FaFile /> Class Documents
        </h2>
        <Link
          href={`/dashboard/classes/${classId}/documents`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-deep"
        >
          Manage documents <FaArrowRight />
        </Link>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-ink-muted">No documents in this class yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-deep/5 text-[10px] font-bold text-deep">
                {doc.type}
              </div>
              <div className="w-32 min-w-0 flex-1">
                <Link
                  href={`/dashboard/classes/${classId}/documents/${encodeURIComponent(doc.id)}`}
                  className="truncate text-sm font-medium text-deep transition-colors hover:text-gold"
                >
                  {doc.name}
                </Link>
                <p className="text-[11px] text-ink-muted">
                  {doc.size} &middot; {doc.uploaded}
                </p>
              </div>
              {doc.tags.length > 0 && (
                <div className="hidden flex-wrap gap-1 sm:flex">
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/dashboard/classes/${classId}/documents/${encodeURIComponent(doc.id)}`}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] text-ink-muted transition-colors hover:bg-gray-50"
                >
                  Details
                </Link>
                {canDelete && (
                  <button
                    onClick={() => handleDeleteDoc(doc)}
                    disabled={deletingId === doc.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === doc.id ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />{" "}
                        Deleting...
                      </>
                    ) : (
                      <>
                        <FaTrash /> Delete
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {docsError && <p className="mt-3 text-xs text-red-600">{docsError}</p>}
    </div>
  );
}