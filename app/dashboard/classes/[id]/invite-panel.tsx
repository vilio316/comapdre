"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaLink, FaCheck, FaXmark } from "react-icons/fa6";
import type { ClassInvitation } from "@/app/lib/class-types";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  class_rep: "Class Rep",
  member: "Member",
};

export default function InvitePanel({
  classId,
  initialInvitations,
}: {
  classId: string;
  initialInvitations: ClassInvitation[];
}) {
  const router = useRouter();

  const [invitations, setInvitations] =
    useState<ClassInvitation[]>(initialInvitations);
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [newInvite, setNewInvite] = useState<ClassInvitation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setNewInvite(null);
    setInviting(true);
    try {
      const res = await fetch(
        `/api/classes/${encodeURIComponent(classId)}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: inviteRole }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setInviteError(body?.error ?? "Failed to create invite link");
        return;
      }
      setInviteSuccess("Invite link created");
      if (body?.invitation) {
        setNewInvite(body.invitation);
        setInvitations((prev) => [body.invitation, ...prev]);
      }
      router.refresh();
    } catch {
      setInviteError("Failed to create invite link");
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
        `/api/classes/${encodeURIComponent(classId)}/invitations/${encodeURIComponent(invitationId)}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setInviteError(body?.error ?? "Failed to cancel invitation");
        return;
      }
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      setNewInvite((prev) => (prev && prev.id === invitationId ? null : prev));
      router.refresh();
    } catch {
      setInviteError("Failed to cancel invitation");
    } finally {
      setCancellingId(null);
    }
  };

  const copyLink = async (invitation: ClassInvitation) => {
    const link =
      invitation.inviteUrl ||
      `${window.location.origin}/invite/${invitation.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invitation.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setInviteError("Could not copy link");
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-deep">Invite members</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Create a short-lived invite link. Anyone with the link can join this
        class as the chosen role before it expires.
      </p>
      <form
        onSubmit={handleInvite}
        className="mt-3 flex flex-col gap-3 sm:flex-row"
      >
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
          {inviting ? "Creating..." : "Create invite link"}
        </button>
      </form>

      {newInvite && (
        <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Share this link
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={newInvite.inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-blue"
            />
            <button
              onClick={() => copyLink(newInvite)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50"
            >
              {copiedId === newInvite.id ? (
                <>
                  <FaCheck /> Copied
                </>
              ) : (
                <>
                  <FaLink /> Copy link
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            Expires{" "}
            <span className="font-medium text-deep">
              {new Date(newInvite.expiresAt).toLocaleDateString()}
            </span>{" "}
            &middot; anyone with the link can join until then
          </p>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Pending invite links
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-deep">
                    {roleLabels[inv.role] ?? inv.role}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Created {new Date(inv.createdAt).toLocaleDateString()} &middot;
                    expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => copyLink(inv)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50"
                  >
                    {copiedId === inv.id ? (
                      <>
                        <FaCheck /> Copied
                      </>
                    ) : (
                      <>
                        <FaLink /> Copy link
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

      {inviteError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {inviteError}
        </div>
      )}
      {inviteSuccess && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {inviteSuccess}
        </div>
      )}
    </div>
  );
}