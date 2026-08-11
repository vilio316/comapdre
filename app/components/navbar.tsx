"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/app/components/theme-provider";
import { NotificationCenter } from "@/app/components/notification-center";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { useSession } = authClient;
  const { data } = useSession();
  const { theme, toggle } = useTheme();
  const inDashboard = pathname.startsWith("/dashboard");

  const logout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/"),
      },
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-deep shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href={data?.user ? "/dashboard" : "/"}
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="text-xl font-bold tracking-tight text-gold">
            Compadre
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {data?.user && <NotificationCenter />}
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-blue-light transition-colors hover:bg-deep-light hover:text-gold-light"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center rounded-md p-1.5 text-blue-light hover:text-gold-light lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {data?.user ? (
            <>
              <Link
                href="/dashboard"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  inDashboard && pathname === "/dashboard"
                    ? "bg-gold text-deep"
                    : "text-blue-light hover:bg-deep-light hover:text-gold-light"
                }`}
              >
                Dashboard
              </Link>
              {pathname.includes("dashb") && (
                <div>
                  <Link
                    href="/dashboard/mcq"
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      pathname === "/dashboard/mcq"
                        ? "bg-gold text-deep"
                        : "text-blue-light hover:bg-deep-light hover:text-gold-light"
                    }`}
                  >
                    MCQ
                  </Link>
                  <Link
                    href="/dashboard/exam-prep"
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      pathname === "/dashboard/exam-prep"
                        ? "bg-gold text-deep"
                        : "text-blue-light hover:bg-deep-light hover:text-gold-light"
                    }`}
                  >
                    Exam Prep
                  </Link>
                  <Link
                    href="/dashboard/ocr"
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      pathname === "/dashboard/ocr"
                        ? "bg-gold text-deep"
                        : "text-blue-light hover:bg-deep-light hover:text-gold-light"
                    }`}
                  >
                    OCR
                  </Link>
                  <Link
                    href="/dashboard/compile"
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      pathname === "/dashboard/compile"
                        ? "bg-gold text-deep"
                        : "text-blue-light hover:bg-deep-light hover:text-gold-light"
                    }`}
                  >
                    Compile
                  </Link>
                  <Link
                    href="/dashboard/documents"
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      pathname === "/dashboard/documents"
                        ? "bg-gold text-deep"
                        : "text-blue-light hover:bg-deep-light hover:text-gold-light"
                    }`}
                  >
                    Documents
                  </Link>
                </div>
              )}
              <button
                onClick={logout}
                className="ml-2 rounded-md px-3 py-1.5 text-sm font-medium text-blue-light transition-colors hover:bg-deep-light hover:text-gold-light"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {pathname !== "/" && (
                <Link
                  href="/"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === "/"
                      ? "bg-gold text-deep"
                      : "text-blue-light hover:bg-deep-light hover:text-gold-light"
                  }`}
                >
                  Home
                </Link>
              )}
              <Link
                href="/auth/sign-in"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-light transition-colors hover:bg-deep-light hover:text-gold-light"
              >
                Sign in
              </Link>
              {!data?.user && (
                <Link
                  href="/auth/sign-up"
                  className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
                >
                  Sign up
                </Link>
              )}
            </>
          )}
        </nav>
      </div>

      {open && (
        <nav className="border-t border-deep-light px-4 pb-3 pt-2 lg:hidden">
          <div className="flex flex-col gap-1">
            {data?.user ? (
              <>
                <MobileLink href="/dashboard" label="Dashboard" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/mcq" label="MCQ" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/exam-prep" label="Exam Prep" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/ocr" label="OCR" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/compile" label="Compile" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/documents" label="Documents" pathname={pathname} onClick={() => setOpen(false)} />
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="rounded-md px-3 py-2 text-left text-sm font-medium text-blue-light hover:bg-deep-light hover:text-gold-light"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                {pathname !== "/" && (
                  <MobileLink href="/" label="Home" pathname={pathname} onClick={() => setOpen(false)} />
                )}
                <MobileLink href="/auth/sign-in" label="Sign in" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/auth/sign-up" label="Sign up" pathname={pathname} onClick={() => setOpen(false)} gold />
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function MobileLink({
  href,
  label,
  pathname,
  onClick,
  gold,
}: {
  href: string;
  label: string;
  pathname: string;
  onClick: () => void;
  gold?: boolean;
}) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-gold text-deep"
          : gold
            ? "bg-gold text-deep"
            : "text-blue-light hover:bg-deep-light hover:text-gold-light"
      }`}
    >
      {label}
    </Link>
  );
}
