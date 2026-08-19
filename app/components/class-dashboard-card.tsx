import type { MyClass } from "@/app/lib/class-types";
import Link from "next/link";
import { FaCode, FaUserGroup } from "react-icons/fa6";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  class_rep: "Class Rep",
  member: "Member",
};

function roleLabel(role: string): string {
  return roleLabels[role] ?? role;
}

export default function ClassDashCard({ cls }: { cls: MyClass }) {
  return (
    <Link
      href={`/dashboard/classes/${cls.id}`}
      className="flex flex-col rounded-xl border border-gray-200 bg-surface p-4 shadow-sm transition-all h-45 md:h-70 hover:border-gold/40 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-deep">{cls.name}</p>
        <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
          {roleLabel(cls.role)}
        </span>
      </div>
      {cls.description && (
        <p className="h-40 text-xs text-ink-muted">{cls.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <FaUserGroup /> {cls.memberCount} member
          {cls.memberCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-gold">
          <FaCode /> {cls.code}
        </span>
      </div>
    </Link>
  );
}
