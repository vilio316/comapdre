"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadPipeline from "@/app/components/upload-pipeline";
import type { UploadedFile } from "@/app/components/upload-pipeline";
import ConfirmDialog from "@/app/components/confirm-dialog";
import { FaTrash } from "react-icons/fa6";
import type { ClassDoc } from "@/app/lib/class-types";

export default function DocumentsManager({
  classId,
  initialDocs,
}: {
  classId: string;
  initialDocs: ClassDoc[];
}) {
  const router = useRouter();

  const [docs, setDocs] = useState<ClassDoc[]>(initialDocs);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allTags = [...new Set(docs.flatMap((d) => d.tags))];

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = !tagFilter || d.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  const handleUpload = (uf: UploadedFile, tags: string[]) => {
    setDocs((prev) => [
      {
        id: uf.id,
        name: uf.name,
        type: uf.type.toLowerCase(),
        size: uf.size,
        uploaded: "Just now",
        tags,
      },
      ...prev,
    ]);
    setShowUpload(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteKey) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(deleteKey)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Delete failed");
      setDocs((prev) => prev.filter((d) => d.id !== deleteKey));
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteKey(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-deep sm:text-3xl">
            Documents
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted sm:mt-1 sm:text-base">
            Manage and organize your class materials.
          </p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {!showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="shrink-0 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
            >
              + Upload
            </button>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="mb-6">
          <UploadPipeline
            onComplete={handleUpload}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20 sm:min-w-55 sm:flex-1"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-surface px-3 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-ink-muted">
            {docs.length === 0 ? "No documents found." : "No documents match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-surface p-3 transition-colors hover:border-gold/40 sm:gap-4 sm:p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-deep/5 text-xs font-bold text-deep sm:h-10 sm:w-10">
                {doc.type}
              </div>
              <div className="w-32 truncate md:min-w-0 flex-1">
                <Link
                  href={`/dashboard/classes/${classId}/documents/${encodeURIComponent(doc.id)}`}
                  className="truncate text-sm font-medium text-deep hover:text-gold transition-colors"
                >
                  {doc.name}
                </Link>
                <p className="text-xs text-ink-muted">
                  {doc.size} &middot; {doc.uploaded}
                </p>
              </div>
              <div className="hidden flex-wrap gap-1 sm:flex">
                {doc.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <Link
                href={`/dashboard/classes/${classId}/documents/${encodeURIComponent(doc.id)}`}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-ink-muted hover:bg-gray-50 sm:px-3"
              >
                Details
              </Link>
              <button
                onClick={() => setDeleteKey(doc.id)}
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${doc.name}`}
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteKey !== null}
        title="Delete document"
        message={`Are you sure you want to delete "${deleteKey}"? This cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setDeleteKey(null);
        }}
      />
    </div>
  );
}