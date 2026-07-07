"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/mcq", label: "MCQ" },
  { href: "/dashboard/exam-prep", label: "Exam Prep" },
  { href: "/dashboard/ocr", label: "OCR" },
  { href: "/dashboard/documents", label: "Documents" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:flex-row sm:px-6 sm:py-10">
      <aside className="shrink-0 sm:w-48">
        <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:gap-0.5">
          {nav.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:shrink sm:rounded-md ${
                  isActive
                    ? "bg-deep text-white"
                    : "text-ink-muted hover:bg-deep/5 hover:text-deep"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
