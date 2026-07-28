"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/mcq", label: "MCQ" },
  { href: "/dashboard/exam-prep", label: "Exam Prep" },
  { href: "/dashboard/ocr", label: "OCR" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !data?.user) {
      router.push("/");
    }
  }, [data, isPending, router]);

  if (isPending) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:flex-row sm:px-6 sm:py-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-deep" />
        </div>
      </div>
    );
  }

  if (!data?.user) {
    return null;
  }

  return (
    <div className="mx-auto grid grid-cols-8 w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:flex-row sm:px-6 sm:py-10">
      <aside className="shrink-0 sm:w-48 col-span-1">
        <nav className="gap-1 overflow-x-auto grid sm:gap-0.5">
          {nav.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:shrink sm:rounded-md ${
                  isActive
                    ? "bg-gold text-deep"
                    : "text-ink-muted hover:bg-deep/5 hover:text-deep"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 col-span-7">{children}</div>
    </div>
  );
}
