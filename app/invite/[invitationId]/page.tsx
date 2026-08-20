"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Skeleton, SkeletonCircle } from "@/app/components/skeleton";
import { FaCode, FaEnvelope, FaCheck, FaRightToBracket } from "react-icons/fa6";

interface InvitationData {
  invitation: {
    id: string;
    role: string;
    expiresAt: string;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    inviterName: string;
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

  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [joined, setJoined] = useState(false);

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
    setActionError("");
    try {
      const res = await fetch(
        `/api/classes/invite/${encodeURIComponent(invitationId)}`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => null);
      if (res.status === 409) {
        setAlreadyMember(true);
        return;
      }
      if (!res.ok) {
        setActionError(body?.error ?? "Failed to join class");
        return;
      }
      setJoined(true);
      const orgId =
        data?.invitation.organizationId ??
        (body?.member?.organizationId as string | undefined) ??
        "";
      router.push(`/dashboard/classes/${encodeURIComponent(orgId)}`);
    } catch {
      setActionError("Failed to join class");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <div className="rounded-xl border border-gray-200 bg-surface p-6 text-center shadow-sm">
          <SkeletonCircle className="mx-auto mb-4 h-12 w-12" />
          <Skeleton className="mx-auto h-5 w-48" />
          <Skeleton className="mx-auto mt-2 h-6 w-36" />
          <div className="mx-auto mt-3 flex items-center justify-center gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="mx-auto mt-3 h-3 w-64" />
          <div className="mt-6">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-lg font-semibold text-deep">
          Invite link unavailable
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {error ||
            "This invite link may have expired or been cancelled."}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light"
        >
          Back to Compadre
        </Link>
      </div>
    );
  }

  const { invitation } = data;

  const signedIn = Boolean(session?.user);

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
          Invited by {invitation.inviterName || "a class member"} &middot;
          link expires{" "}
          {new Date(invitation.expiresAt).toLocaleDateString()}
        </p>

        {(actionError || alreadyMember || joined) && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              actionError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {actionError ||
              (alreadyMember
                ? "You are already a member of this class."
                : "You have joined the class.")}
          </div>
        )}

        <div className="mt-6">
          {sessionPending ? (
            <div className="flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
            </div>
          ) : signedIn ? (
            <button
              onClick={accept}
              disabled={acting || joined}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-60"
            >
              <FaCheck /> {acting ? "Joining..." : "Join class"}
            </button>
          ) : (
            <Link
              href={`/auth/sign-in?callbackURL=${encodeURIComponent(`/invite/${invitationId}`)}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light"
            >
              <FaRightToBracket /> Sign in to join
            </Link>
          )}

          {alreadyMember && (
            <Link
              href={`/dashboard/classes/${encodeURIComponent(invitation.organizationId)}`}
              className="mt-3 inline-block text-xs font-medium text-blue underline transition-colors hover:text-blue-light"
            >
              Go to class
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}