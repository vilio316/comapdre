"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  FaArrowLeft,
  FaCode,
  FaUserGroup,
  FaLink,
  FaEnvelope,
  FaCheck,
  FaXmark,
  FaClipboard,
  FaBook,
  FaCamera,
  FaFileImport,
  FaFile,
  FaArrowRight,
  FaTrash,
} from "react-icons/fa6";

interface ClassMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface ClassDoc {
  id: string;
  name: string;
  type: string;
  size: string;
  uploaded: string;
  tags: string[];
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface ClassDetail {
  class: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    role: string;
    classRepName: string | null;
    memberCount: number;
    createdAt: string;
  };
  canInvite: boolean;
  members: ClassMember[];
  invitations: Invitation[];
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  class_rep: "Class Rep",
  member: "Member",
};

function roleLabel(role: string): string {
  return roleLabels[role] ?? role;
}

const classTools = [
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

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [docs, setDocs] = useState<ClassDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [docsError, setDocsError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const body = await res.json();
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch(`/api/classes/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body) => {
            throw new Error(body?.error ?? `Request failed (${res.status})`);
          });
        }
        return res.json();
      })
      .then((body) => setData(body))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load class"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    authClient.organization.setActive({ organizationId: id }).catch(() => {
      // active class is best-effort; tools fall back to recent membership
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/classes/${encodeURIComponent(id)}/documents`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((body) => {
        if (body.docs) setDocs(body.docs);
        setDocsLoaded(true);
      })
      .catch(() => {
        setDocsLoaded(true);
      })
      .finally(() => setDocsLoading(false));
  }, [id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(
        `/api/classes/${encodeURIComponent(id)}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setInviteError(body?.error ?? "Failed to send invitation");
        return;
      }
      setInviteSuccess("Invitation sent");
      setInviteEmail("");
      await load();
    } catch {
      setInviteError("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleCancel = async (invitationId: string) => {
    setCancellingId(invitationId);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch(
        `/api/classes/${encodeURIComponent(id)}/invitations/${encodeURIComponent(invitationId)}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setInviteError(body?.error ?? "Failed to cancel invitation");
        return;
      }
      await load();
    } catch {
      setInviteError("Failed to cancel invitation");
    } finally {
      setCancellingId(null);
    }
  };

  const copyLink = async (invitationId: string) => {
    const link = `${window.location.origin}/dashboard/classes/invite/${invitationId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invitationId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setInviteError("Could not copy link");
    }
  };

  const roleCanDelete = ["owner", "admin", "class_rep"].includes(
    data?.class.role ?? "",
  );

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
    } catch {
      setDocsError("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-lg font-semibold text-deep">Could not load class</p>
        <p className="mt-1 text-sm text-ink-muted">{error}</p>
        <button
          onClick={() => router.push("/dashboard/classes")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light"
        >
          <FaArrowLeft /> Back to classes
        </button>
      </div>
    );
  }

  const { class: cls, canInvite, members, invitations } = data;

  return (
    <div>
      <Link
        href="/dashboard/classes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-deep"
      >
        <FaArrowLeft /> Classes
      </Link>

      <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-deep sm:text-xl">
                {cls.name}
              </h1>
              <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
                {roleLabel(cls.role)}
              </span>
            </div>
            {cls.description && (
              <p className="mt-1 text-sm text-ink-muted">{cls.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5 font-medium text-gold">
                <FaCode /> {cls.code}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FaUserGroup /> {cls.memberCount} member
                {cls.memberCount === 1 ? "" : "s"}
              </span>
              {cls.classRepName && (
                <span className="inline-flex items-center gap-1.5">
                  <FaEnvelope /> Class Rep: {cls.classRepName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {classTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-gray-200 bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md"
          >
            <div className="mb-2 text-deep transition-colors group-hover:text-gold">
              {tool.icon}
            </div>
            <p className="text-sm font-semibold text-deep">{tool.title}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{tool.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-deep">
            <FaFile /> Class Documents
          </h2>
          <Link
            href={`/dashboard/classes/${id}/documents`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-deep"
          >
            Manage documents <FaArrowRight />
          </Link>
        </div>

        {docsLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-gray-100 p-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
          </div>
        ) : !docsLoaded || docs.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No documents in this class yet.
          </p>
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
                    href={`/dashboard/classes/${id}/documents/${encodeURIComponent(doc.id)}`}
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
                    href={`/dashboard/classes/${id}/documents/${encodeURIComponent(doc.id)}`}
                    className="rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] text-ink-muted transition-colors hover:bg-gray-50"
                  >
                    Details
                  </Link>
                  {roleCanDelete && (
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

      {inviteError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {inviteError}
        </div>
      )}
      {inviteSuccess && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {inviteSuccess}
        </div>
      )}

      {canInvite && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-deep">
            Invite a member
          </h2>
          <form
            onSubmit={handleInvite}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 rounded-lg border border-gray-300 bg-surface px-4 py-2 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-gray-300 bg-surface px-4 py-2 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="class_rep">Class Rep</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-60"
            >
              {inviting ? "Sending..." : "Invite"}
            </button>
          </form>

          {invitations.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Pending invitations
              </h3>
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-surface p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-deep">
                        {inv.email}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {roleLabel(inv.role)} &middot; expires{" "}
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => copyLink(inv.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50"
                      >
                        {copiedId === inv.id ? (
                          <>
                            <FaCheck /> Copied
                          </>
                        ) : (
                          <>
                            <FaLink /> Copy invite link
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleCancel(inv.id)}
                        disabled={cancellingId === inv.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                      >
                        <FaXmark /> Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-deep">Members</h2>
        {members.length === 0 ? (
          <p className="text-sm text-ink-muted">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-deep">
                    {member.name || "Unnamed"}
                  </p>
                  <p className="truncate text-[11px] text-ink-muted">
                    {member.email}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
                  {roleLabel(member.role)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
