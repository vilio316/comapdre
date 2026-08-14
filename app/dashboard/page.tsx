"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserAvatar } from "@/app/components/user-avatar";
import {
  FaUserGroup,
  FaGears,
  FaMagnifyingGlass,
  FaPlus,
} from "react-icons/fa6";
import ClassDashCard from "../components/class-dashboard-card";
import { FaSignOutAlt } from "react-icons/fa";

export interface MyClass {
  id: string;
  name: string;
  code: string;
  description: string | null;
  role: string;
  memberCount: number;
}

export default function DashboardPage() {
  const { useSession } = authClient;
  const { data } = useSession();
  const router = useRouter();

  const [classes, setClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/classes")
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.classes) setClasses(data.classes);
        if (data.error) setError(data.error);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load classes:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          <UserAvatar size={40} className="sm:hidden grid" />
          <UserAvatar size={48} className="hidden sm:grid" />
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

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-surface px-6 py-16 text-center">
          <FaUserGroup className="mx-auto mb-4 text-4xl text-ink-muted" />
          <h2 className="text-lg font-bold text-deep">
            Join a class to get started
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Your classes and their tools will appear here once you join. Search
            for a class by name or code, or create your own.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard/classes"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light"
            >
              <FaMagnifyingGlass /> Browse classes
            </Link>
            <Link
              href="/dashboard/classes?create=1"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50 hover:text-deep"
            >
              <FaPlus /> Create a class
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-deep">Your Classes</h2>
            <Link
              href="/dashboard/classes"
              className="text-xs font-medium text-ink-muted transition-colors hover:text-deep"
            >
              Manage classes
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <ClassDashCard cls={cls} key={cls.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
