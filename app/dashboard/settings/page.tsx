"use client";

import { useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/app/components/user-avatar";
import { FaImage } from "react-icons/fa6";

export default function SettingsPage() {
  const { useSession } = authClient;
  const { data, refetch } = useSession();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const user = data?.user;

  const logout = () => {
    authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/") },
    });
  };

  const handleAvatarPick = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 5 MB.");
      return;
    }
    setUploadError(null);
    setUploading(true);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let message = "Upload failed";
        try {
          const errBody = await res.json();
          if (errBody && typeof errBody.error === "string") message = errBody.error;
        } catch {
          // non-JSON error body
        }
        throw new Error(message);
      }
      await res.json();
      await refetch();
      setPreview(null);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to update profile picture",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep sm:text-3xl">Settings</h1>
        <p className="mt-0.5 text-sm text-ink-muted sm:mt-1 sm:text-base">
          Manage your account and preferences.
        </p>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-deep">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              {preview ? (
                <img
                  src={preview}
                  alt="New avatar preview"
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <UserAvatar size={56} />
              )}
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-deep text-white shadow transition-colors hover:bg-deep-light disabled:opacity-50"
                aria-label="Change profile picture"
              >
                <FaImage />
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarPick(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-deep">{user?.name ?? "User"}</p>
              <p className="text-sm text-ink-muted">{user?.email ?? ""}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {uploading ? "Uploading..." : "PNG, JPG, or WEBP up to 5 MB"}
              </p>
            </div>
          </div>
          {uploadError && (
            <p className="mt-3 text-sm text-red-600">{uploadError}</p>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-deep">Account</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <div>
                <p className="text-sm font-medium text-deep">Email</p>
                <p className="text-xs text-ink-muted">{user?.email ?? "—"}</p>
              </div>
              <button className="rounded-md border border-gray-200 px-3 py-1 text-xs text-ink-muted transition-colors hover:bg-gray-50">
                Change
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <div>
                <p className="text-sm font-medium text-deep">Password</p>
                <p className="text-xs text-ink-muted">••••••••</p>
              </div>
              <button className="rounded-md border border-gray-200 px-3 py-1 text-xs text-ink-muted transition-colors hover:bg-gray-50">
                Change
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-deep">
            Preferences
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-deep">
                  Email notifications
                </p>
                <p className="text-xs text-ink-muted">
                  Receive updates about your documents
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 accent-gold"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-deep">Dark mode</p>
                <p className="text-xs text-ink-muted">Coming soon</p>
              </div>
              <input type="checkbox" disabled className="h-4 w-4 accent-gold" />
            </label>
          </div>
        </section>

        <div className="flex justify-end pb-8">
          <button
            onClick={logout}
            className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
