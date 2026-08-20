import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserServer } from "@/app/lib/server-session";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/mcq", label: "MCQ" },
  { href: "/dashboard/ocr", label: "OCR" },
  { href: "/dashboard/classes", label: "Classes" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUserServer();
  if (!user) redirect("/");

  return (
    <div className="mx-auto grid md:grid-cols-8 w-full flex-1 flex-col gap-8 px-4 py-8 sm:flex-row sm:px-6 sm:py-10">
      <aside className="shrink-0 sm:col-span-3 md:cols-span-1 hidden">
        <nav className="gap-1 overflow-x-auto grid sm:gap-0.5">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-deep/5 hover:text-deep sm:shrink sm:rounded-md"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 md:col-span-8 sm:col-span-5">{children}</div>
    </div>
  );
}
