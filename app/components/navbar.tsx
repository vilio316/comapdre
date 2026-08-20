"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/app/components/theme-provider";
import { NotificationCenter } from "@/app/components/notification-center";
import { FaMoon, FaSun } from "react-icons/fa6";
import { IoClose, IoMenu } from "react-icons/io5";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/mcq", label: "MCQ" },
  { href: "/dashboard/ocr", label: "OCR" },
  { href: "/dashboard/classes", label: "Classes" },
  { href: "/dashboard/compile", label: "Compile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { useSession } = authClient;
  const { data } = useSession();
  const { theme, toggle } = useTheme();

  const close = () => setOpen(false);

  const logout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          close();
          router.push("/");
        },
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
            {theme === "light" ? <FaMoon /> : <FaSun />}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center rounded-md p-1.5 text-blue-light hover:text-gold-light"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <IoClose /> : <IoMenu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40" aria-hidden="true">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
        </div>
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-deep shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        aria-label="Navigation"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-deep-light px-4 py-3">
          <span className="text-sm font-bold text-gold">Menu</span>
          <button
            onClick={close}
            className="rounded-md p-1.5 text-blue-light transition-colors hover:bg-deep-light hover:text-gold-light"
            aria-label="Close menu"
          >
            <IoClose />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            {data?.user ? (
              <>
                {navLinks.map(({ href, label }) => (
                  <SideNavLink
                    key={href}
                    href={href}
                    label={label}
                    pathname={pathname}
                    onClick={close}
                  />
                ))}
                <button
                  onClick={logout}
                  className="rounded-md px-3 py-2 text-left text-sm font-medium text-blue-light transition-colors hover:bg-deep-light hover:text-gold-light"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                {pathname !== "/" && (
                  <SideNavLink
                    href="/"
                    label="Home"
                    pathname={pathname}
                    onClick={close}
                  />
                )}
                <SideNavLink
                  href="/auth/sign-in"
                  label="Sign in"
                  pathname={pathname}
                  onClick={close}
                />
                <SideNavLink
                  href="/auth/sign-up"
                  label="Sign up"
                  pathname={pathname}
                  onClick={close}
                  gold
                />
              </>
            )}
          </div>
        </nav>
      </aside>
    </header>
  );
}

function SideNavLink({
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
