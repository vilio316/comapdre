"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaCode, FaEnvelope, FaCheck, FaXmark } from "react-icons/fa6";

interface InvitationData {
  invitation: {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    inviterEmail: string;
  };
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  class_rep: "Class Rep",
  member: "Member",
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const invitationId = params.invitationId as string;

  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch(`/api/classes/invite/${encodeURIComponent(invitationId)}`)
      .then((r) => {
        if (!r.ok) {
          return r.json().then((body) => {
            throw new Error(body?.error ?? `Request failed (${r.status})`);
          });
        }
        return r.json();
      })
      .then((body) => setData(body))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [invitationId]);

  const accept = async () => {
    setActing(true);
    setError("");
    try {
      const res = await fetch(
        `/api/classes/invite/${encodeURIComponent(invitationId)}`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Failed to accept invitation");
        return;
      }
      router.push(
        `/dashboard/classes/${encodeURIComponent(data?.invitation.organizationId ?? "")}`,
      );
    } catch {
      setError("Failed to accept invitation");
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    setActing(true);
    setError("");
    try {
      const res = await fetch(
        `/api/classes/invite/${encodeURIComponent(invitationId)}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Failed to reject invitation");
        return;
      }
      router.push("/dashboard/classes");
    } catch {
      setError("Failed to reject invitation");
    } finally {
      setActing(false);
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
        <p className="text-lg font-semibold text-deep">Invitation unavailable</p>
        <p className="mt-1 text-sm text-ink-muted">
          {error ||
            "This invitation may have expired, been cancelled, or is for a different account."}
        </p>
        <button
          onClick={() => router.push("/dashboard/classes")}
          className="mt-4 rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light"
        >
          Back to classes
        </button>
      </div>
    );
  }

  const { invitation } = data;

  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="rounded-xl border border-gray-200 bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-xl text-gold">
          <FaEnvelope />
        </div>
        <h1 className="text-lg font-bold text-deep">
          You&apos;ve been invited to join
        </h1>
        <p className="mt-1 text-xl font-bold text-gold">
          {invitation.organizationName}
        </p>
        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5 font-medium text-gold">
            <FaCode /> {invitation.organizationSlug}
          </span>
          <span>as {roleLabels[invitation.role] ?? invitation.role}</span>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Invited by {invitation.inviterEmail} &middot; expires{" "}
          {new Date(invitation.expiresAt).toLocaleDateString()}
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={accept}
            disabled={acting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-60"
          >
            <FaCheck /> Accept
          </button>
          <button
            onClick={reject}
            disabled={acting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <FaXmark /> Decline
          </button>
        </div>
      </div>
    </div>
  );
}