"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { useSession } = authClient;
  const { data } = useSession();
  const router = useRouter();

  const user = data?.user;

  const logout = () => {
    authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/") },
    });
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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-lg font-bold text-gold">
              {user?.image ? (
                <img src={user.image} className="h-full w-full rounded-full object-cover" alt="" />
              ) : (
                user?.name?.charAt(0) ?? "?"
              )}
            </div>
            <div>
              <p className="font-semibold text-deep">{user?.name ?? "User"}</p>
              <p className="text-sm text-ink-muted">{user?.email ?? ""}</p>
            </div>
          </div>
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
          <h2 className="mb-4 text-base font-semibold text-deep">Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-deep">Email notifications</p>
                <p className="text-xs text-ink-muted">Receive updates about your documents</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-gold" />
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
