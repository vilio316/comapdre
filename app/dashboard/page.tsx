import Link from "next/link";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/app/components/user-avatar";
import { LogoutButton } from "@/app/components/logout-button";
import {
  FaUserGroup,
  FaGears,
  FaMagnifyingGlass,
  FaPlus,
} from "react-icons/fa6";
import ClassDashCard from "../components/class-dashboard-card";
import { getMyClasses } from "@/app/lib/classes";
import { getSessionUserServer } from "@/app/lib/server-session";

export default async function DashboardPage() {
  const user = await getSessionUserServer();
  if (!user) redirect("/");

  const classes = await getMyClasses(user.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <UserAvatar size={40} className="sm:hidden grid" />
          <UserAvatar size={48} className="hidden sm:grid" />
          <div>
            <p className="text-sm font-semibold text-deep sm:text-base">
              Welcome, {user.name ?? "User"}
            </p>
            <p className="text-xs text-ink-muted">{user.email ?? ""}</p>
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
          <LogoutButton />
        </div>
      </div>

      {classes.length === 0 ? (
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
              className="text-xs p-2 font-medium text-ink-muted transition-all hover:text-deep bg-gold rounded-2xl hover:scale-105"
            >
              Manage classes
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {classes.map((cls) => (
              <ClassDashCard cls={cls} key={cls.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
