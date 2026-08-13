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
  { href: "/dashboard/classes", label: "Classes" },
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
      <div className="mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-8 sm:flex-row sm:px-6 sm:py-10">
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
    <div className="mx-auto grid md:grid-cols-8 w-full flex-1 flex-col gap-8 px-4 py-8 sm:flex-row sm:px-6 sm:py-10">
      <aside className="shrink-0 sm:col-span-3 md:cols-span-1 hidden">
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
      <div className="min-w-0 md:col-span-8 sm:col-span-5">{children}</div>
    </div>
  );
}
