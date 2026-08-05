"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function McqTabs() {
  const pathname = usePathname();
  const isHistory = pathname.startsWith("/dashboard/mcq/history");

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-gold text-deep"
        : "text-ink-muted hover:text-deep"
    }`;

  return (
    <div className="mt-5 flex w-fit gap-1 rounded-lg border border-gray-200 bg-surface p-1">
      <Link href="/dashboard/mcq" className={tabClass(!isHistory)}>
        Generate
      </Link>
      <Link href="/dashboard/mcq/history" className={tabClass(isHistory)}>
        History
      </Link>
    </div>
  );
}
