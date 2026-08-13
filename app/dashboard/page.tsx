"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadPipeline from "@/app/components/upload-pipeline";
import type { UploadedFile } from "@/app/components/upload-pipeline";
import ConfirmDialog from "@/app/components/confirm-dialog";
import { UserAvatar } from "@/app/components/user-avatar";
import {} from "react-icons";
import {
  FaBook,
  FaCamera,
  FaClipboard,
  FaFileImport,
  FaGears,
  FaTrash,
} from "react-icons/fa6";
import { FaSignOutAlt } from "react-icons/fa";

interface Doc {
  id: string;
  name: string;
  type: string;
  size: string;
  uploaded: string;
  tags: string[];
}

const quickActions = [
  {
    title: "MCQ",
    desc: "Generate practice questions",
    href: "/dashboard/mcq",
    icon: <FaClipboard />,
  },
  {
    title: "Exam Prep",
    desc: "Flashcards & summaries",
    href: "/dashboard/exam-prep",
    icon: <FaBook />,
  },
  {
    title: "OCR",
    desc: "Scan local documents for text",
    href: "/dashboard/ocr",
    icon: <FaCamera />,
  },
  {
    title: "Compile",
    desc: "Merge documents into one file",
    href: "/dashboard/compile",
    icon: <FaFileImport />,
  },
];

export default function DashboardPage() {
  const { useSession } = authClient;
  const { data } = useSession();
  const router = useRouter();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => {
        if (data.docs) setDocs(data.docs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = !tagFilter || d.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  const allTags = [...new Set(docs.flatMap((d) => d.tags))];

  const handleUpload = (uf: UploadedFile, tags: string[]) => {
    const doc: Doc = {
      id: uf.id,
      name: uf.name,
      type: uf.type,
      size: uf.size,
      uploaded: new Date().toISOString().slice(0, 10),
      tags,
    };
    setDocs((prev) => [doc, ...prev]);
    setShowUpload(false);
  };

  const handleDelete = async () => {
    if (!deleteKey) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(deleteKey)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Delete failed");
      setDocs((prev) => prev.filter((d) => d.id !== deleteKey));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteKey(null);
    }
  };

  const logout = () => {
    authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/") },
    });
  };

  const user = data?.user;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <UserAvatar size={40} className="sm:hidden" />
          <UserAvatar size={48} className="hidden sm:block" />
          <div>
            <p className="text-sm font-semibold text-deep sm:text-base">
              Welcome, {user?.name ?? "User"}
            </p>
            <p className="text-xs text-ink-muted">{user?.email ?? ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50 hover:text-deep"
          >
            <FaGears />
            Settings
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-xl border border-gray-200 bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md"
          >
            <div className="mb-2 text-deep group-hover:text-gold transition-colors">
              {a.icon}
            </div>
            <p className="text-sm font-semibold text-deep">{a.title}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{a.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-deep">Your Documents</h2>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light"
          >
            + Upload
          </button>
        )}
      </div>

      {showUpload && (
        <div className="mb-5">
          <UploadPipeline
            onComplete={handleUpload}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="flex-1 rounded-lg border border-gray-300 bg-surface px-4 py-2 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-sm text-ink-muted">No documents found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-surface p-3 transition-colors hover:border-gold/40 sm:gap-4 sm:p-3.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-deep/5 text-[10px] font-bold text-deep sm:h-9 sm:w-9 sm:text-xs">
                {doc.type}
              </div>
              <div className="w-32 flex-1 md:min-w-0 truncate">
                <Link
                  href={`/dashboard/documents/${encodeURIComponent(doc.id)}`}
                  className="text-[12px] md:text-sm font-medium text-deep hover:text-gold transition-colors"
                >
                  {doc.name}
                </Link>
                <p className="text-[11px] text-ink-muted">
                  {doc.size} &middot; {doc.uploaded}
                </p>
              </div>
              <div className="hidden gap-1 sm:flex">
                {doc.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <Link
                href={`/dashboard/documents/${encodeURIComponent(doc.id)}`}
                className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-ink-muted transition-colors hover:bg-gray-50 sm:px-2.5 sm:text-xs"
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
